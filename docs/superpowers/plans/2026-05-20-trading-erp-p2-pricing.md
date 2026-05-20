# Trading ERP Phase 2 — Pricing Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a rule-based pricing engine (customer type/tier × country × date × volume breaks) that auto-populates `unit_price` in the sale form when a customer and SKU are selected.

**Architecture:** Two new DB tables for classification (`customer_types`, `customer_tiers`) + two for rules (`price_rules`, `price_bands`). A pure `resolvePriceRule()` function does client-side rule matching after a single server-action fetch when a customer is chosen. The `/pricing` page provides CRUD for all pricing data. Customer form gains type/tier selectors. SaleFields gains auto-populate.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + PostgREST), Tailwind v4, shadcn/ui, react-hook-form + zod, Server Actions, Vitest.

**Repo:** `~/trading-erp` — all file paths are relative to that directory.

---

## Task 1: DB Migrations

**Files:**
- Create: `supabase/migrations/0007_add_customer_types_tiers.sql`
- Create: `supabase/migrations/0008_add_price_rules.sql`

- [ ] **Step 1: Create migration 0007**

Create `supabase/migrations/0007_add_customer_types_tiers.sql`:
```sql
create table customer_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table customer_tiers (
  id uuid primary key default gen_random_uuid(),
  customer_type_id uuid not null references customer_types(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  unique (customer_type_id, name)
);

alter table customers
  add column customer_type_id uuid references customer_types(id),
  add column customer_tier_id uuid references customer_tiers(id);

alter table customer_types enable row level security;
alter table customer_tiers enable row level security;

create policy "auth full access" on customer_types
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on customer_tiers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

- [ ] **Step 2: Create migration 0008**

Create `supabase/migrations/0008_add_price_rules.sql`:
```sql
create table price_rules (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references skus(id),
  customer_type_id uuid references customer_types(id),
  customer_tier_id uuid references customer_tiers(id),
  country text,
  currency_code text not null,
  valid_from date not null,
  valid_until date,
  is_promotion boolean not null default false,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table price_bands (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references price_rules(id) on delete cascade,
  min_qty integer not null check (min_qty >= 1),
  unit_price_local_minor bigint not null,
  unit_price_usd_minor bigint not null,
  unique (rule_id, min_qty)
);

create index idx_price_rules_sku on price_rules(sku_id);
create index idx_price_rules_dates on price_rules(valid_from, valid_until);

alter table price_rules enable row level security;
alter table price_bands enable row level security;

create policy "auth full access" on price_rules
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on price_bands
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

- [ ] **Step 3: Apply migrations**

Run from `~/trading-erp`:
```bash
supabase db push
```
Expected: "Applying migration 0007_add_customer_types_tiers.sql" and "0008_add_price_rules.sql" with no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): customer_types, customer_tiers, price_rules, price_bands"
```

---

## Task 2: Pricing Schemas + Customer Type/Tier Actions

**Files:**
- Create: `src/lib/schemas/pricing.ts`
- Create: `src/lib/actions/customerTypes.ts`

- [ ] **Step 1: Create `src/lib/schemas/pricing.ts`**

```ts
import { z } from "zod";
import { currencyCodeSchema } from "./cashAccount";

export const customerTypeInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
});
export type CustomerTypeInput = z.infer<typeof customerTypeInputSchema>;

export const customerTierInputSchema = z.object({
  customerTypeId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(80),
});
export type CustomerTierInput = z.infer<typeof customerTierInputSchema>;

const moneyString = z.string().regex(/^\d+(\.\d+)?$/, "Must be a positive number");

export const bandInputSchema = z.object({
  minQty: z.coerce.number().int().min(1),
  unitPriceLocal: moneyString,
  unitPriceUsd: moneyString,
});
export type BandInput = z.infer<typeof bandInputSchema>;

export const priceRuleInputSchema = z.object({
  skuId: z.string().uuid(),
  customerTypeId: z.string().uuid().nullable().default(null),
  customerTierId: z.string().uuid().nullable().default(null),
  country: z.string().trim().max(50).nullable().default(null),
  currencyCode: currencyCodeSchema,
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  isPromotion: z.boolean().default(false),
  priority: z.coerce.number().int().default(0),
  bands: z.array(bandInputSchema).min(1, "At least one price band required"),
});
export type PriceRuleInput = z.infer<typeof priceRuleInputSchema>;
```

- [ ] **Step 2: Create `src/lib/actions/customerTypes.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  customerTypeInputSchema, type CustomerTypeInput,
  customerTierInputSchema, type CustomerTierInput,
} from "@/lib/schemas/pricing";

export async function createCustomerType(input: CustomerTypeInput) {
  const parsed = customerTypeInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("customer_types").insert({
    name: parsed.name,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/pricing");
}

export async function updateCustomerType(id: string, input: CustomerTypeInput) {
  const parsed = customerTypeInputSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("customer_types").update({ name: parsed.name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pricing");
}

export async function deleteCustomerType(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customer_types").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pricing");
}

export async function createCustomerTier(input: CustomerTierInput) {
  const parsed = customerTierInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("customer_tiers").insert({
    customer_type_id: parsed.customerTypeId,
    name: parsed.name,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/pricing");
}

export async function updateCustomerTier(id: string, input: CustomerTierInput) {
  const parsed = customerTierInputSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("customer_tiers").update({ name: parsed.name }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pricing");
}

export async function deleteCustomerTier(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customer_tiers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pricing");
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/pricing.ts src/lib/actions/customerTypes.ts
git commit -m "feat(pricing): schemas + customer type/tier server actions"
```

---

## Task 3: `resolvePriceRule` Pure Function + Tests

**Files:**
- Create: `src/lib/pricing.ts`
- Create: `src/lib/__tests__/pricing.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/pricing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolvePriceRule, type PriceRuleForLookup } from "@/lib/pricing";

const CTX_EXACT = { customer_type_id: "type-1", customer_tier_id: "tier-1", country: "Taiwan" };
const CTX_ANY   = { customer_type_id: null, customer_tier_id: null, country: null };

function rule(overrides: Partial<PriceRuleForLookup> = {}): PriceRuleForLookup {
  return {
    id: "rule-1",
    sku_id: "sku-1",
    customer_type_id: null,
    customer_tier_id: null,
    country: null,
    is_promotion: false,
    priority: 0,
    valid_from: "2026-01-01",
    bands: [{ min_qty: 1, unit_price_local_minor: 28000, unit_price_usd_minor: 850 }],
    ...overrides,
  };
}

describe("resolvePriceRule", () => {
  it("returns null when no rules provided", () => {
    expect(resolvePriceRule([], "sku-1", CTX_ANY, 1)).toBeNull();
  });

  it("returns null when no rule matches the sku", () => {
    expect(resolvePriceRule([rule()], "sku-other", CTX_ANY, 1)).toBeNull();
  });

  it("wildcard rule matches any customer context", () => {
    const result = resolvePriceRule([rule()], "sku-1", CTX_EXACT, 1);
    expect(result?.unit_price_local_minor).toBe(28000);
    expect(result?.unit_price_usd_minor).toBe(850);
  });

  it("exact-match rule returns its price", () => {
    const r = rule({ customer_type_id: "type-1", customer_tier_id: "tier-1", country: "Taiwan",
      bands: [{ min_qty: 1, unit_price_local_minor: 25000, unit_price_usd_minor: 800 }] });
    const result = resolvePriceRule([r], "sku-1", CTX_EXACT, 1);
    expect(result?.unit_price_local_minor).toBe(25000);
  });

  it("specific rule beats wildcard rule", () => {
    const wildcard = rule({ bands: [{ min_qty: 1, unit_price_local_minor: 28000, unit_price_usd_minor: 850 }] });
    const specific = rule({ id: "rule-2", customer_type_id: "type-1",
      bands: [{ min_qty: 1, unit_price_local_minor: 25000, unit_price_usd_minor: 800 }] });
    const result = resolvePriceRule([wildcard, specific], "sku-1", CTX_EXACT, 1);
    expect(result?.unit_price_local_minor).toBe(25000);
  });

  it("promotion beats same-specificity non-promotion", () => {
    const normal = rule({ id: "rule-1", bands: [{ min_qty: 1, unit_price_local_minor: 28000, unit_price_usd_minor: 850 }] });
    const promo  = rule({ id: "rule-2", is_promotion: true, bands: [{ min_qty: 1, unit_price_local_minor: 22000, unit_price_usd_minor: 700 }] });
    const result = resolvePriceRule([normal, promo], "sku-1", CTX_ANY, 1);
    expect(result?.unit_price_local_minor).toBe(22000);
  });

  it("selects correct volume band", () => {
    const r = rule({
      bands: [
        { min_qty: 1,  unit_price_local_minor: 28000, unit_price_usd_minor: 850 },
        { min_qty: 10, unit_price_local_minor: 25000, unit_price_usd_minor: 800 },
        { min_qty: 50, unit_price_local_minor: 22000, unit_price_usd_minor: 700 },
      ],
    });
    expect(resolvePriceRule([r], "sku-1", CTX_ANY, 1)?.unit_price_local_minor).toBe(28000);
    expect(resolvePriceRule([r], "sku-1", CTX_ANY, 9)?.unit_price_local_minor).toBe(28000);
    expect(resolvePriceRule([r], "sku-1", CTX_ANY, 10)?.unit_price_local_minor).toBe(25000);
    expect(resolvePriceRule([r], "sku-1", CTX_ANY, 49)?.unit_price_local_minor).toBe(25000);
    expect(resolvePriceRule([r], "sku-1", CTX_ANY, 50)?.unit_price_local_minor).toBe(22000);
  });

  it("rule with wrong type does not match", () => {
    const r = rule({ customer_type_id: "type-2" });
    expect(resolvePriceRule([r], "sku-1", CTX_EXACT, 1)).toBeNull();
  });

  it("rule with wrong country does not match", () => {
    const r = rule({ country: "Eswatini" });
    expect(resolvePriceRule([r], "sku-1", CTX_EXACT, 1)).toBeNull();
  });

  it("priority breaks ties between same-specificity rules", () => {
    const low  = rule({ id: "rule-1", priority: 0, bands: [{ min_qty: 1, unit_price_local_minor: 28000, unit_price_usd_minor: 850 }] });
    const high = rule({ id: "rule-2", priority: 5, bands: [{ min_qty: 1, unit_price_local_minor: 20000, unit_price_usd_minor: 650 }] });
    const result = resolvePriceRule([low, high], "sku-1", CTX_ANY, 1);
    expect(result?.unit_price_local_minor).toBe(20000);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|pricing"
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/lib/pricing.ts`**

```ts
export type PriceRuleForLookup = {
  id: string;
  sku_id: string;
  customer_type_id: string | null;
  customer_tier_id: string | null;
  country: string | null;
  is_promotion: boolean;
  priority: number;
  valid_from: string;
  bands: Array<{
    min_qty: number;
    unit_price_local_minor: number;
    unit_price_usd_minor: number;
  }>;
};

export type CustomerContext = {
  customer_type_id: string | null;
  customer_tier_id: string | null;
  country: string | null;
};

export type PriceLookupResult = {
  unit_price_local_minor: number;
  unit_price_usd_minor: number;
  rule_id: string;
} | null;

function specificity(r: PriceRuleForLookup): number {
  return (r.customer_type_id !== null ? 1 : 0)
       + (r.customer_tier_id !== null ? 1 : 0)
       + (r.country !== null ? 1 : 0);
}

export function resolvePriceRule(
  rules: PriceRuleForLookup[],
  skuId: string,
  ctx: CustomerContext,
  qty: number,
): PriceLookupResult {
  const matching = rules.filter((r) => {
    if (r.sku_id !== skuId) return false;
    if (r.customer_type_id !== null && r.customer_type_id !== ctx.customer_type_id) return false;
    if (r.customer_tier_id !== null && r.customer_tier_id !== ctx.customer_tier_id) return false;
    if (r.country !== null && r.country !== ctx.country) return false;
    return true;
  });

  if (matching.length === 0) return null;

  const ranked = [...matching].sort((a, b) => {
    const ds = specificity(b) - specificity(a);
    if (ds !== 0) return ds;
    if (b.is_promotion !== a.is_promotion) return b.is_promotion ? 1 : -1;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.valid_from.localeCompare(a.valid_from);
  });

  const top = ranked[0];
  const sortedBands = [...top.bands].sort((a, b) => b.min_qty - a.min_qty);
  const band = sortedBands.find((b) => b.min_qty <= qty);
  if (!band) return null;

  return {
    unit_price_local_minor: band.unit_price_local_minor,
    unit_price_usd_minor: band.unit_price_usd_minor,
    rule_id: top.id,
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- --reporter=verbose 2>&1 | grep -E "FAIL|PASS|✓|×"
```
Expected: all 39 + 9 new = 48 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing.ts src/lib/__tests__/pricing.test.ts
git commit -m "feat(pricing): resolvePriceRule pure function + 9 tests"
```

---

## Task 4: Price Rule Server Actions + `fetchRulesForSale`

**Files:**
- Create: `src/lib/actions/priceRules.ts`

- [ ] **Step 1: Create `src/lib/actions/priceRules.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { priceRuleInputSchema, type PriceRuleInput } from "@/lib/schemas/pricing";
import { toMinor } from "@/lib/money";
import type { PriceRuleForLookup } from "@/lib/pricing";

export async function createPriceRule(input: PriceRuleInput): Promise<{ id: string }> {
  const parsed = priceRuleInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rule, error } = await supabase.from("price_rules").insert({
    sku_id: parsed.skuId,
    customer_type_id: parsed.customerTypeId,
    customer_tier_id: parsed.customerTierId,
    country: parsed.country || null,
    currency_code: parsed.currencyCode,
    valid_from: parsed.validFrom,
    valid_until: parsed.validUntil,
    is_promotion: parsed.isPromotion,
    priority: parsed.priority,
    created_by: user?.id ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);

  const bands = parsed.bands.map((b) => ({
    rule_id: rule.id,
    min_qty: b.minQty,
    unit_price_local_minor: Number(toMinor(b.unitPriceLocal, parsed.currencyCode)),
    unit_price_usd_minor: Number(toMinor(b.unitPriceUsd, "USD")),
  }));
  const { error: bandError } = await supabase.from("price_bands").insert(bands);
  if (bandError) throw new Error(bandError.message);

  revalidatePath("/pricing");
  return { id: rule.id };
}

export async function updatePriceRule(id: string, input: PriceRuleInput): Promise<void> {
  const parsed = priceRuleInputSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase.from("price_rules").update({
    sku_id: parsed.skuId,
    customer_type_id: parsed.customerTypeId,
    customer_tier_id: parsed.customerTierId,
    country: parsed.country || null,
    currency_code: parsed.currencyCode,
    valid_from: parsed.validFrom,
    valid_until: parsed.validUntil,
    is_promotion: parsed.isPromotion,
    priority: parsed.priority,
  }).eq("id", id);
  if (error) throw new Error(error.message);

  // Replace all bands
  await supabase.from("price_bands").delete().eq("rule_id", id);
  const bands = parsed.bands.map((b) => ({
    rule_id: id,
    min_qty: b.minQty,
    unit_price_local_minor: Number(toMinor(b.unitPriceLocal, parsed.currencyCode)),
    unit_price_usd_minor: Number(toMinor(b.unitPriceUsd, "USD")),
  }));
  const { error: bandError } = await supabase.from("price_bands").insert(bands);
  if (bandError) throw new Error(bandError.message);

  revalidatePath("/pricing");
}

export async function deletePriceRule(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("price_rules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/pricing");
}

export async function fetchRulesForSale(params: {
  customerTypeId: string | null;
  customerTierId: string | null;
  country: string | null;
  currencyCode: string;
  saleDate: string;
}): Promise<PriceRuleForLookup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("price_rules")
    .select(`
      id, sku_id, customer_type_id, customer_tier_id, country,
      is_promotion, priority, valid_from,
      price_bands (min_qty, unit_price_local_minor, unit_price_usd_minor)
    `)
    .eq("currency_code", params.currencyCode)
    .lte("valid_from", params.saleDate)
    .or(`valid_until.is.null,valid_until.gte.${params.saleDate}`);
  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((r) => {
      if (r.customer_type_id !== null && r.customer_type_id !== params.customerTypeId) return false;
      if (r.customer_tier_id !== null && r.customer_tier_id !== params.customerTierId) return false;
      if (r.country !== null && r.country !== params.country) return false;
      return true;
    })
    .map((r) => ({
      id: r.id,
      sku_id: r.sku_id,
      customer_type_id: r.customer_type_id,
      customer_tier_id: r.customer_tier_id,
      country: r.country,
      is_promotion: r.is_promotion,
      priority: r.priority,
      valid_from: r.valid_from,
      bands: (r.price_bands ?? []).map((b: { min_qty: number; unit_price_local_minor: number; unit_price_usd_minor: number }) => ({
        min_qty: b.min_qty,
        unit_price_local_minor: b.unit_price_local_minor,
        unit_price_usd_minor: b.unit_price_usd_minor,
      })),
    }));
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ Compiled"
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/priceRules.ts
git commit -m "feat(pricing): price rule CRUD actions + fetchRulesForSale"
```

---

## Task 5: CustomerTypesPanel (CRUD at `/pricing`)

**Files:**
- Create: `src/app/(app)/pricing/_components/CustomerTypesPanel.tsx`

- [ ] **Step 1: Create `src/app/(app)/pricing/_components/CustomerTypesPanel.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCustomerType, updateCustomerType, deleteCustomerType,
  createCustomerTier, updateCustomerTier, deleteCustomerTier,
} from "@/lib/actions/customerTypes";

type Tier = { id: string; name: string; customer_type_id: string };
type CustomerType = { id: string; name: string };

export function CustomerTypesPanel({
  types,
  tiers,
}: {
  types: CustomerType[];
  tiers: Tier[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Inline create type
  const [newTypeName, setNewTypeName] = useState("");
  // Inline edit type
  const [editTypeId, setEditTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState("");
  // Inline create tier
  const [newTierName, setNewTierName] = useState<Record<string, string>>({});
  // Inline edit tier
  const [editTierId, setEditTierId] = useState<string | null>(null);
  const [editTierName, setEditTierName] = useState("");

  function run(fn: () => Promise<void>) {
    setError(null);
    start(async () => {
      try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Customer Types & Tiers</h2>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Type list */}
      <div className="space-y-2">
        {types.map((t) => (
          <div key={t.id} className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50">
              <button
                type="button"
                className="flex-1 text-left font-medium text-sm flex items-center gap-1"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <span>{expanded === t.id ? "▼" : "▶"}</span>
                {editTypeId === t.id ? (
                  <Input
                    value={editTypeName}
                    onChange={(e) => setEditTypeName(e.target.value)}
                    className="h-6 text-sm py-0 w-40"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  t.name
                )}
              </button>
              {editTypeId === t.id ? (
                <>
                  <Button size="sm" variant="outline" disabled={pending}
                    onClick={() => run(async () => { await updateCustomerType(t.id, { name: editTypeName }); setEditTypeId(null); })}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditTypeId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setEditTypeId(t.id); setEditTypeName(t.name); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600"
                    disabled={pending}
                    onClick={() => run(() => deleteCustomerType(t.id))}>
                    Delete
                  </Button>
                </>
              )}
            </div>

            {expanded === t.id && (
              <div className="px-4 py-2 space-y-1">
                {tiers.filter((ti) => ti.customer_type_id === t.id).map((ti) => (
                  <div key={ti.id} className="flex items-center gap-2 py-1">
                    {editTierId === ti.id ? (
                      <Input
                        value={editTierName}
                        onChange={(e) => setEditTierName(e.target.value)}
                        className="h-6 text-sm py-0 w-40"
                      />
                    ) : (
                      <span className="flex-1 text-sm text-slate-700">{ti.name}</span>
                    )}
                    {editTierId === ti.id ? (
                      <>
                        <Button size="sm" variant="outline" disabled={pending}
                          onClick={() => run(async () => {
                            await updateCustomerTier(ti.id, { customerTypeId: t.id, name: editTierName });
                            setEditTierId(null);
                          })}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditTierId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost"
                          onClick={() => { setEditTierId(ti.id); setEditTierName(ti.name); }}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" disabled={pending}
                          onClick={() => run(() => deleteCustomerTier(ti.id))}>Delete</Button>
                      </>
                    )}
                  </div>
                ))}
                {/* Add tier row */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="New tier name"
                    value={newTierName[t.id] ?? ""}
                    onChange={(e) => setNewTierName({ ...newTierName, [t.id]: e.target.value })}
                    className="h-7 text-sm w-40"
                  />
                  <Button size="sm" variant="outline" disabled={pending || !newTierName[t.id]?.trim()}
                    onClick={() => run(async () => {
                      await createCustomerTier({ customerTypeId: t.id, name: newTierName[t.id] });
                      setNewTierName({ ...newTierName, [t.id]: "" });
                    })}>
                    + Add tier
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add type row */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Input
          placeholder="New type name (e.g. B2B)"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          className="w-52"
        />
        <Button variant="outline" disabled={pending || !newTypeName.trim()}
          onClick={() => run(async () => {
            await createCustomerType({ name: newTypeName });
            setNewTypeName("");
          })}>
          + New type
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ Compiled"
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/pricing/_components/CustomerTypesPanel.tsx
git commit -m "feat(pricing): CustomerTypesPanel with inline CRUD"
```

---

## Task 6: PriceRuleForm + PriceRulesPanel

**Files:**
- Create: `src/app/(app)/pricing/_components/PriceRulesPanel.tsx`
- Create: `src/app/(app)/pricing/rules/new/page.tsx`
- Create: `src/app/(app)/pricing/rules/new/PriceRuleForm.tsx`
- Create: `src/app/(app)/pricing/rules/[id]/edit/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/pricing/_components/PriceRulesPanel.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { deletePriceRule } from "@/lib/actions/priceRules";

type Sku = { id: string; code: string; name: string };
type CustomerType = { id: string; name: string };
type CustomerTier = { id: string; name: string; customer_type_id: string };
type Band = { min_qty: number; unit_price_local_minor: number; unit_price_usd_minor: number };
type Rule = {
  id: string;
  sku_id: string;
  customer_type_id: string | null;
  customer_tier_id: string | null;
  country: string | null;
  currency_code: string;
  valid_from: string;
  valid_until: string | null;
  is_promotion: boolean;
  priority: number;
  price_bands: Band[];
};

export function PriceRulesPanel({
  rules, skus, types, tiers,
}: {
  rules: Rule[];
  skus: Sku[];
  types: CustomerType[];
  tiers: CustomerTier[];
}) {
  const [pending, start] = useTransition();

  const skuMap = new Map(skus.map((s) => [s.id, s]));
  const typeMap = new Map(types.map((t) => [t.id, t]));
  const tierMap = new Map(tiers.map((t) => [t.id, t]));

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Price Rules</h2>
        <Button asChild><Link href="/pricing/rules/new">+ New rule</Link></Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Valid from</TableHead>
              <TableHead>Valid until</TableHead>
              <TableHead>Bands</TableHead>
              <TableHead>Promo</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                  No price rules yet. Create one to enable auto-populate in the sale form.
                </TableCell>
              </TableRow>
            )}
            {rules.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{skuMap.get(r.sku_id)?.code ?? r.sku_id.slice(0, 8)}</TableCell>
                <TableCell>{r.customer_type_id ? (typeMap.get(r.customer_type_id)?.name ?? "—") : <span className="text-slate-400">Any</span>}</TableCell>
                <TableCell>{r.customer_tier_id ? (tierMap.get(r.customer_tier_id)?.name ?? "—") : <span className="text-slate-400">Any</span>}</TableCell>
                <TableCell>{r.country ?? <span className="text-slate-400">Any</span>}</TableCell>
                <TableCell>{r.currency_code}</TableCell>
                <TableCell>{r.valid_from}</TableCell>
                <TableCell>{r.valid_until ?? <span className="text-slate-400">Open</span>}</TableCell>
                <TableCell>{r.price_bands.length} band{r.price_bands.length !== 1 ? "s" : ""}</TableCell>
                <TableCell>{r.is_promotion ? <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Promo</span> : "—"}</TableCell>
                <TableCell className="space-x-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/pricing/rules/${r.id}/edit`}>Edit</Link>
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" disabled={pending}
                    onClick={() => start(() => deletePriceRule(r.id))}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(app)/pricing/rules/new/PriceRuleForm.tsx`**

```tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CURRENCY_CODES } from "@/lib/schemas/cashAccount";
import { COUNTRIES, COUNTRIES_DATALIST_ID } from "@/lib/countries";
import { createPriceRule, updatePriceRule } from "@/lib/actions/priceRules";
import type { PriceRuleInput, BandInput } from "@/lib/schemas/pricing";

type Sku = { id: string; code: string; name: string };
type CustomerType = { id: string; name: string };
type CustomerTier = { id: string; name: string; customer_type_id: string };

type InitialRule = {
  id: string;
  sku_id: string;
  customer_type_id: string | null;
  customer_tier_id: string | null;
  country: string | null;
  currency_code: string;
  valid_from: string;
  valid_until: string | null;
  is_promotion: boolean;
  priority: number;
  price_bands: Array<{ min_qty: number; unit_price_local_minor: number; unit_price_usd_minor: number }>;
};

type Band = { minQty: string; unitPriceLocal: string; unitPriceUsd: string };

function minorToDisplay(minor: number, decimals: number): string {
  if (decimals === 0) return String(minor);
  const s = String(Math.abs(minor)).padStart(decimals + 1, "0");
  const int = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals);
  return (minor < 0 ? "-" : "") + int + "." + frac;
}

const DECIMALS: Record<string, number> = { CNY: 2, NTD: 0, SZL: 2, ZAR: 2, USD: 2 };

export function PriceRuleForm({
  skus, types, tiers, initial,
}: {
  skus: Sku[];
  types: CustomerType[];
  tiers: CustomerTier[];
  initial?: InitialRule;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [skuId, setSkuId] = useState(initial?.sku_id ?? "");
  const [typeId, setTypeId] = useState<string>(initial?.customer_type_id ?? "");
  const [tierId, setTierId] = useState<string>(initial?.customer_tier_id ?? "");
  const [country, setCountry] = useState(initial?.country ?? "");
  const [currency, setCurrency] = useState(initial?.currency_code ?? "NTD");
  const [validFrom, setValidFrom] = useState(initial?.valid_from ?? new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? "");
  const [isPromotion, setIsPromotion] = useState(initial?.is_promotion ?? false);
  const [priority, setPriority] = useState(String(initial?.priority ?? 0));

  const dec = DECIMALS[currency] ?? 2;
  const [bands, setBands] = useState<Band[]>(
    initial?.price_bands.length
      ? initial.price_bands.map((b) => ({
          minQty: String(b.min_qty),
          unitPriceLocal: minorToDisplay(b.unit_price_local_minor, dec),
          unitPriceUsd: minorToDisplay(b.unit_price_usd_minor, 2),
        }))
      : [{ minQty: "1", unitPriceLocal: "", unitPriceUsd: "" }]
  );

  // Filter tiers to selected type
  const availableTiers = tiers.filter((t) => t.customer_type_id === typeId);
  useEffect(() => { if (!availableTiers.find((t) => t.id === tierId)) setTierId(""); }, [typeId]);

  function updateBand(i: number, patch: Partial<Band>) {
    setBands(bands.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  }

  function addBand() {
    setBands([...bands, { minQty: "", unitPriceLocal: "", unitPriceUsd: "" }]);
  }

  function removeBand(i: number) {
    if (bands.length === 1) return;
    setBands(bands.filter((_, j) => j !== i));
  }

  function buildInput(): PriceRuleInput {
    return {
      skuId,
      customerTypeId: typeId || null,
      customerTierId: tierId || null,
      country: country.trim() || null,
      currencyCode: currency as PriceRuleInput["currencyCode"],
      validFrom,
      validUntil: validUntil || null,
      isPromotion,
      priority: Number(priority) || 0,
      bands: bands.map((b) => ({
        minQty: Number(b.minQty),
        unitPriceLocal: b.unitPriceLocal,
        unitPriceUsd: b.unitPriceUsd,
      } as BandInput)),
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const input = buildInput();
        if (initial) await updatePriceRule(initial.id, input);
        else await createPriceRule(input);
        router.push("/pricing");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      {/* SKU */}
      <div>
        <Label>SKU *</Label>
        <Select value={skuId} onValueChange={setSkuId}>
          <SelectTrigger><SelectValue placeholder="Select SKU…" /></SelectTrigger>
          <SelectContent>
            {skus.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type + Tier + Country */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Customer type</Label>
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tier</Label>
          <Select value={tierId} onValueChange={setTierId} disabled={!typeId}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any</SelectItem>
              {availableTiers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Country</Label>
          <Input
            list={COUNTRIES_DATALIST_ID}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Any"
          />
          <datalist id={COUNTRIES_DATALIST_ID}>
            {COUNTRIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      {/* Currency + Dates */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Currency *</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Valid from *</Label>
          <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
        </div>
        <div>
          <Label>Valid until</Label>
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
      </div>

      {/* Priority + Promo */}
      <div className="flex items-center gap-6">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Input id="priority" type="number" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-24" />
          <p className="text-xs text-slate-500 mt-1">Higher number = higher priority when rules tie.</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-4">
          <input type="checkbox" checked={isPromotion} onChange={(e) => setIsPromotion(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium">Promotional price (overrides base price)</span>
        </label>
      </div>

      {/* Bands */}
      <div>
        <Label>Price bands</Label>
        <p className="text-xs text-slate-500 mb-2">First band min qty is always 1. Add more rows for volume breaks.</p>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-slate-500 px-1">
            <span>Min qty</span>
            <span>Local price ({currency})</span>
            <span>USD price</span>
            <span></span>
          </div>
          {bands.map((b, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center">
              <Input
                type="number"
                value={i === 0 ? "1" : b.minQty}
                disabled={i === 0}
                onChange={(e) => updateBand(i, { minQty: e.target.value })}
                className="text-right"
                min={1}
              />
              <Input
                type="text"
                inputMode="decimal"
                placeholder={dec === 0 ? "0" : "0.00"}
                value={b.unitPriceLocal}
                onChange={(e) => updateBand(i, { unitPriceLocal: e.target.value })}
                className="text-right"
              />
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={b.unitPriceUsd}
                onChange={(e) => updateBand(i, { unitPriceUsd: e.target.value })}
                className="text-right"
              />
              <Button type="button" variant="ghost" size="sm"
                onClick={() => removeBand(i)} disabled={bands.length === 1}>✕</Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addBand}>
          + Add volume break
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !skuId || !validFrom}>
          {pending ? "Saving…" : initial ? "Update rule" : "Create rule"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/pricing")}>Cancel</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create `src/app/(app)/pricing/rules/new/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { PriceRuleForm } from "./PriceRuleForm";

export default async function NewPriceRulePage() {
  const supabase = await createClient();
  const [{ data: skus }, { data: types }, { data: tiers }] = await Promise.all([
    supabase.from("skus").select("id, code, name").eq("is_archived", false).order("code"),
    supabase.from("customer_types").select("id, name").order("name"),
    supabase.from("customer_tiers").select("id, name, customer_type_id").order("name"),
  ]);
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">New price rule</h1>
      <PriceRuleForm skus={skus ?? []} types={types ?? []} tiers={tiers ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/(app)/pricing/rules/[id]/edit/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PriceRuleForm } from "../../new/PriceRuleForm";

export default async function EditPriceRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: rule }, { data: skus }, { data: types }, { data: tiers }] = await Promise.all([
    supabase.from("price_rules").select(`
      id, sku_id, customer_type_id, customer_tier_id, country,
      currency_code, valid_from, valid_until, is_promotion, priority,
      price_bands (min_qty, unit_price_local_minor, unit_price_usd_minor)
    `).eq("id", id).single(),
    supabase.from("skus").select("id, code, name").eq("is_archived", false).order("code"),
    supabase.from("customer_types").select("id, name").order("name"),
    supabase.from("customer_tiers").select("id, name, customer_type_id").order("name"),
  ]);
  if (!rule) notFound();
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Edit price rule</h1>
      <PriceRuleForm
        skus={skus ?? []}
        types={types ?? []}
        tiers={tiers ?? []}
        initial={{
          ...rule,
          price_bands: rule.price_bands ?? [],
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ Compiled"
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/pricing/
git commit -m "feat(pricing): PriceRulesPanel + PriceRuleForm + new/edit pages"
```

---

## Task 7: `/pricing` Page + Sidebar Nav

**Files:**
- Create: `src/app/(app)/pricing/page.tsx`
- Modify: `src/components/AppSidebar.tsx`
- Modify: `src/components/MobileNav.tsx`

- [ ] **Step 1: Create `src/app/(app)/pricing/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import { CustomerTypesPanel } from "./_components/CustomerTypesPanel";
import { PriceRulesPanel } from "./_components/PriceRulesPanel";

export default async function PricingPage() {
  const supabase = await createClient();
  const [
    { data: types },
    { data: tiers },
    { data: rules },
    { data: skus },
  ] = await Promise.all([
    supabase.from("customer_types").select("id, name").order("name"),
    supabase.from("customer_tiers").select("id, name, customer_type_id").order("name"),
    supabase.from("price_rules").select(`
      id, sku_id, customer_type_id, customer_tier_id, country,
      currency_code, valid_from, valid_until, is_promotion, priority,
      price_bands (min_qty, unit_price_local_minor, unit_price_usd_minor)
    `).order("valid_from", { ascending: false }),
    supabase.from("skus").select("id, code, name").eq("is_archived", false).order("code"),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Pricing</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CustomerTypesPanel types={types ?? []} tiers={tiers ?? []} />
        </div>
        <div className="lg:col-span-2">
          <PriceRulesPanel
            rules={(rules ?? []).map((r) => ({ ...r, price_bands: r.price_bands ?? [] }))}
            skus={skus ?? []}
            types={types ?? []}
            tiers={tiers ?? []}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Pricing to `src/components/AppSidebar.tsx`**

In AppSidebar.tsx, find the NAV array and add the Pricing entry after Cash accounts:

```ts
const NAV = [
  { href: "/", label: "Overview" },
  { href: "/new", label: "New transaction" },
  { href: "/transactions", label: "Transactions" },
  { href: "/skus", label: "SKUs" },
  { href: "/cash-accounts", label: "Cash accounts" },
  { href: "/pricing", label: "Pricing" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/customers", label: "Customers" },
];
```

- [ ] **Step 3: Add Pricing to `src/components/MobileNav.tsx`**

In MobileNav.tsx, update the NAV array to match:

```ts
const NAV = [
  { href: "/", label: "Overview" },
  { href: "/new", label: "New" },
  { href: "/transactions", label: "Transactions" },
  { href: "/skus", label: "SKUs" },
  { href: "/cash-accounts", label: "Cash accounts" },
  { href: "/pricing", label: "Pricing" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/customers", label: "Customers" },
];
```

- [ ] **Step 4: Verify build + tests**

```bash
npm run build 2>&1 | grep -E "error TS|✓ Compiled" && npm test 2>&1 | tail -5
```
Expected: compiled ✓, 48 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/pricing/page.tsx src/components/AppSidebar.tsx src/components/MobileNav.tsx
git commit -m "feat(pricing): /pricing page + sidebar nav item"
```

---

## Task 8: Update Customer Form with Type + Tier Fields

**Files:**
- Modify: `src/lib/schemas/partner.ts`
- Modify: `src/lib/actions/customers.ts`
- Modify: `src/app/(app)/customers/CustomerFormDialog.tsx`
- Modify: `src/app/(app)/customers/page.tsx`

- [ ] **Step 1: Update `src/lib/schemas/partner.ts`**

Add optional type/tier fields to `customerInputSchema` only (suppliers don't need them):

```ts
import { z } from "zod";

export const partnerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  country: z.string().trim().max(50).default(""),
  contactPerson: z.string().trim().max(120).default(""),
  email: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(50).default(""),
  taxId: z.string().trim().max(50).default(""),
  address: z.string().trim().max(500).default(""),
  notes: z.string().trim().max(500).default(""),
});

export type PartnerInput = z.infer<typeof partnerInputSchema>;

export const supplierInputSchema = partnerInputSchema;
export type SupplierInput = PartnerInput;

export const customerInputSchema = partnerInputSchema.extend({
  customerTypeId: z.string().uuid().nullable().default(null),
  customerTierId: z.string().uuid().nullable().default(null),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;
```

- [ ] **Step 2: Update `src/lib/actions/customers.ts`**

Add `customer_type_id` and `customer_tier_id` to insert/update:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { customerInputSchema, type CustomerInput } from "@/lib/schemas/partner";

export async function createCustomer(input: CustomerInput): Promise<{ id: string; name: string }> {
  const parsed = customerInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("customers").insert({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
    customer_type_id: parsed.customerTypeId,
    customer_tier_id: parsed.customerTierId,
    created_by: user?.id ?? null,
  }).select("id, name").single();
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
  return data;
}

export async function updateCustomer(id: string, input: CustomerInput): Promise<void> {
  const parsed = customerInputSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
    customer_type_id: parsed.customerTypeId,
    customer_tier_id: parsed.customerTierId,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}

export async function archiveCustomer(id: string, archived: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ is_archived: archived }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}
```

- [ ] **Step 3: Update `src/app/(app)/customers/CustomerFormDialog.tsx`**

Add `customerTypes` and `customerTiers` props, and two new form fields. Replace the entire file:

```tsx
"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerInputSchema, type CustomerInput } from "@/lib/schemas/partner";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, COUNTRIES_DATALIST_ID, COUNTRY_DIAL_CODES } from "@/lib/countries";
import type { z } from "zod";

type CustomerFormValues = z.input<typeof customerInputSchema>;
type CustomerType = { id: string; name: string };
type CustomerTier = { id: string; name: string; customer_type_id: string };

type Props = {
  mode: "create" | "edit";
  initial?: { id: string } & CustomerInput;
  trigger: React.ReactNode;
  customerTypes: CustomerType[];
  customerTiers: CustomerTier[];
};

export function CustomerFormDialog({ mode, initial, trigger, customerTypes, customerTiers }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<CustomerFormValues>({
      resolver: zodResolver(customerInputSchema),
      defaultValues: initial ?? {
        name: "", country: "", contactPerson: "", email: "", phone: "",
        taxId: "", address: "", notes: "", customerTypeId: null, customerTierId: null,
      },
    });

  const country = watch("country");
  const selectedTypeId = watch("customerTypeId");
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const dialCode = country ? COUNTRY_DIAL_CODES[country] : undefined;
    if (!dialCode) return;
    const phone = watch("phone") ?? "";
    if (!phone) {
      setValue("phone", dialCode + " ");
    } else if (phone.startsWith("+")) {
      const rest = phone.replace(/^\+\d+\s*/, "");
      setValue("phone", dialCode + (rest ? " " + rest : " "));
    }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear tier when type changes
  useEffect(() => {
    setValue("customerTierId", null);
  }, [selectedTypeId, setValue]);

  const availableTiers = customerTiers.filter((t) => t.customer_type_id === selectedTypeId);

  function onSubmit(data: CustomerFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        const parsed = customerInputSchema.parse(data);
        if (mode === "create") await createCustomer(parsed);
        else await updateCustomer(initial!.id, parsed);
        setOpen(false);
        reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New customer" : "Edit customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" list={COUNTRIES_DATALIST_ID} {...register("country")} placeholder="Pick or type a country" />
            <datalist id={COUNTRIES_DATALIST_ID}>
              {COUNTRIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Customer type</Label>
              <Select
                value={selectedTypeId ?? ""}
                onValueChange={(v) => setValue("customerTypeId", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {customerTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tier</Label>
              <Select
                value={watch("customerTierId") ?? ""}
                onValueChange={(v) => setValue("customerTierId", v || null)}
                disabled={!selectedTypeId}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {availableTiers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="contactPerson">Contact person</Label>
            <Input id="contactPerson" {...register("contactPerson")} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" {...register("email")} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div>
            <Label htmlFor="taxId">Tax ID</Label>
            <Input id="taxId" {...register("taxId")} />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...register("notes")} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Update `src/app/(app)/customers/page.tsx`**

Fetch customer types + tiers and pass to dialog:

```tsx
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CustomerFormDialog } from "./CustomerFormDialog";
import { CustomerTable } from "./CustomerTable";
import type { CustomerInput } from "@/lib/schemas/partner";

export default async function CustomersPage() {
  const supabase = await createClient();
  const [{ data, error }, { data: types }, { data: tiers }] = await Promise.all([
    supabase.from("customers").select(
      "id, name, country, contact_person, email, phone, tax_id, address, notes, is_archived, customer_type_id, customer_tier_id"
    ).order("name"),
    supabase.from("customer_types").select("id, name").order("name"),
    supabase.from("customer_tiers").select("id, name, customer_type_id").order("name"),
  ]);
  if (error) throw new Error(error.message);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <CustomerFormDialog
          mode="create"
          trigger={<Button>New customer</Button>}
          customerTypes={types ?? []}
          customerTiers={tiers ?? []}
        />
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <CustomerTable
          rows={data ?? []}
          customerTypes={types ?? []}
          customerTiers={tiers ?? []}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update `src/app/(app)/customers/CustomerTable.tsx` to pass types/tiers to edit dialogs**

Read the current file, then add `customerTypes` and `customerTiers` props and thread them to each `CustomerFormDialog` in edit mode. The existing `Row` type needs `customer_type_id` and `customer_tier_id`. Below is the full replacement:

```tsx
"use client";

import { useTransition } from "react";
import { archiveCustomer } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CustomerFormDialog } from "./CustomerFormDialog";
import type { CustomerInput } from "@/lib/schemas/partner";

type CustomerType = { id: string; name: string };
type CustomerTier = { id: string; name: string; customer_type_id: string };

type Row = {
  id: string;
  name: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
  notes: string;
  is_archived: boolean;
  customer_type_id: string | null;
  customer_tier_id: string | null;
};

export function CustomerTable({
  rows,
  customerTypes,
  customerTiers,
}: {
  rows: Row[];
  customerTypes: CustomerType[];
  customerTiers: CustomerTier[];
}) {
  const [pending, startTransition] = useTransition();

  function toggleArchive(id: string, current: boolean) {
    startTransition(() => archiveCustomer(id, !current));
  }

  const typeMap = new Map(customerTypes.map((t) => [t.id, t.name]));
  const tierMap = new Map(customerTiers.map((t) => [t.id, t.name]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.name}</TableCell>
            <TableCell>{r.country || "—"}</TableCell>
            <TableCell>{r.customer_type_id ? (typeMap.get(r.customer_type_id) ?? "—") : <span className="text-slate-400">—</span>}</TableCell>
            <TableCell>{r.customer_tier_id ? (tierMap.get(r.customer_tier_id) ?? "—") : <span className="text-slate-400">—</span>}</TableCell>
            <TableCell>{r.email || "—"}</TableCell>
            <TableCell>{r.phone || "—"}</TableCell>
            <TableCell>{r.is_archived ? "Archived" : "Active"}</TableCell>
            <TableCell className="space-x-2">
              <CustomerFormDialog
                mode="edit"
                initial={{
                  id: r.id,
                  name: r.name,
                  country: r.country,
                  contactPerson: r.contact_person,
                  email: r.email,
                  phone: r.phone,
                  taxId: r.tax_id,
                  address: r.address,
                  notes: r.notes,
                  customerTypeId: r.customer_type_id,
                  customerTierId: r.customer_tier_id,
                } as { id: string } & CustomerInput}
                trigger={<Button size="sm" variant="outline">Edit</Button>}
                customerTypes={customerTypes}
                customerTiers={customerTiers}
              />
              <Button
                size="sm"
                variant={r.is_archived ? "outline" : "ghost"}
                disabled={pending}
                onClick={() => toggleArchive(r.id, r.is_archived)}
              >
                {r.is_archived ? "Unarchive" : "Archive"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-slate-500 py-8">No customers yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 6: Verify build + tests**

```bash
npm run build 2>&1 | grep -E "error TS|✓ Compiled" && npm test 2>&1 | tail -5
```
Expected: compiled ✓, 48 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/partner.ts src/lib/actions/customers.ts \
  src/app/\(app\)/customers/CustomerFormDialog.tsx \
  src/app/\(app\)/customers/CustomerTable.tsx \
  src/app/\(app\)/customers/page.tsx
git commit -m "feat(customers): type + tier selectors in customer form and table"
```

---

## Task 9: Sale Form Auto-Populate

**Files:**
- Modify: `src/components/forms/CustomerLinePicker.tsx`
- Modify: `src/components/forms/SaleFields.tsx`
- Modify: `src/app/(app)/new/page.tsx`

- [ ] **Step 1: Update `src/components/forms/CustomerLinePicker.tsx`**

Extend `Partner` type to include pricing context and pass full partner object on change:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InlinePartnerCreateDialog } from "./InlinePartnerCreateDialog";

export type Partner = {
  id: string;
  name: string;
  country: string;
  customer_type_id: string | null;
  customer_tier_id: string | null;
};

type Props = {
  value: string | null;
  onChange: (id: string | null, name: string, partner: Partner | null) => void;
  initialPartners: Partner[];
  disabled?: boolean;
};

export function CustomerLinePicker({ value, onChange, initialPartners, disabled }: Props) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const supabase = createClient();

  async function refreshPartners() {
    const { data } = await supabase
      .from("customers")
      .select("id, name, country, customer_type_id, customer_tier_id")
      .eq("is_archived", false)
      .order("name");
    if (data) setPartners(data);
  }

  async function handleCreated(p: { id: string; name: string }) {
    await refreshPartners();
    const found = partners.find((x) => x.id === p.id) ?? {
      id: p.id, name: p.name, country: "", customer_type_id: null, customer_tier_id: null,
    };
    onChange(p.id, p.name, found);
  }

  return (
    <div className="flex gap-1 items-center">
      <Select
        value={value ?? null}
        disabled={disabled}
        onValueChange={(v) => {
          if (v !== null) {
            const found = partners.find((p) => p.id === v) ?? null;
            onChange(v, found?.name ?? "", found);
          }
        }}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select customer…">
            {(val: string | null) => {
              if (!val) return "Select customer…";
              const p = partners.find((x) => x.id === val);
              return p ? (p.country ? `${p.name} — ${p.country}` : p.name) : val;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {partners.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.country ? `${p.name} — ${p.country}` : p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!disabled && (
        <InlinePartnerCreateDialog
          mode="customer"
          onCreated={handleCreated}
          trigger={
            <button
              type="button"
              title="Add new customer"
              className="shrink-0 h-8 w-8 rounded-lg border border-input text-blue-600 hover:bg-slate-100 text-sm font-semibold"
            >
              +
            </button>
          }
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/(app)/new/page.tsx`** — extend customer query to include type/tier

```tsx
import { createClient } from "@/lib/supabase/server";
import { NewTransactionForm } from "@/components/forms/NewTransactionForm";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const [
    { data: skus },
    { data: warehouses },
    { data: cashAccounts },
    { data: suppliers },
    { data: customers },
  ] = await Promise.all([
    supabase.from("skus").select("id, code, name").eq("is_archived", false).order("code"),
    supabase.from("warehouses").select("id, name, is_damaged").order("name"),
    supabase.from("cash_accounts").select("id, name, currency_code").eq("is_archived", false).order("name"),
    supabase.from("suppliers").select("id, name, country").eq("is_archived", false).order("name"),
    supabase.from("customers").select("id, name, country, customer_type_id, customer_tier_id").eq("is_archived", false).order("name"),
  ]);
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">New transaction</h1>
      <NewTransactionForm
        skus={skus ?? []}
        warehouses={warehouses ?? []}
        cashAccounts={cashAccounts ?? []}
        suppliers={suppliers ?? []}
        customers={customers ?? []}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update `src/components/forms/SaleFields.tsx`** — add auto-populate

Replace the full file:

```tsx
"use client";

import { useEffect, useState } from "react";
import { CURRENCY_CODES } from "@/lib/schemas/cashAccount";
import { type CurrencyCode, fromMinor } from "@/lib/money";
import { DEFAULT_TAX_BASIS_POINTS } from "@/lib/taxRates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SkuLinePicker } from "./SkuLinePicker";
import { CashLegRows, type CashLeg } from "./CashLegRows";
import { CustomerLinePicker, type Partner } from "./CustomerLinePicker";
import type { TransactionInput } from "@/lib/schemas/transaction";
import { ScanModal } from "./ScanModal";
import { mergeTally, type TallyRow, type FormLine } from "@/lib/barcode/mergeTally";
import { fetchRulesForSale } from "@/lib/actions/priceRules";
import { resolvePriceRule, type PriceRuleForLookup } from "@/lib/pricing";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };
type Line = { skuId: string; warehouseId: string; qty: string; unit_price: string };

export function SaleFields({
  skus, warehouses, cashAccounts, customers, onChange,
}: {
  skus: Sku[];
  warehouses: Warehouse[];
  cashAccounts: CashAccount[];
  customers: Partner[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerCtx, setCustomerCtx] = useState<{
    customer_type_id: string | null;
    customer_tier_id: string | null;
    country: string | null;
  } | null>(null);
  const [counterpartyName, setCounterpartyName] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NTD");
  const [taxRatePercent, setTaxRatePercent] = useState<string>(
    String(DEFAULT_TAX_BASIS_POINTS[currency] / 100),
  );
  const [lines, setLines] = useState<Line[]>([
    { skuId: "", warehouseId: "", qty: "", unit_price: "" },
  ]);
  const [cashLegs, setCashLegs] = useState<CashLeg[]>([
    { cashAccountId: "", description: "Customer payment", amount: "" },
  ]);
  const [scanOpen, setScanOpen] = useState(false);
  const [activeRules, setActiveRules] = useState<PriceRuleForLookup[]>([]);

  const liveWarehouses = warehouses.filter((w) => !w.is_damaged);

  // Fetch price rules when customer or currency changes
  useEffect(() => {
    if (!customerId || !customerCtx) { setActiveRules([]); return; }
    const today = new Date().toISOString().slice(0, 10);
    fetchRulesForSale({
      customerTypeId: customerCtx.customer_type_id,
      customerTierId: customerCtx.customer_tier_id,
      country: customerCtx.country,
      currencyCode: currency,
      saleDate: today,
    }).then(setActiveRules).catch(() => setActiveRules([]));
  }, [customerId, customerCtx, currency]);

  useEffect(() => {
    onChange({
      type: "SALE",
      counterpartyName,
      customerId,
      currencyCode: currency,
      taxRateBasisPoints: Math.max(0, Math.min(10000, Math.round(Number(taxRatePercent) * 100) || 0)),
      lines: lines.filter((l) => l.skuId && l.warehouseId && l.qty && l.unit_price).map((l) => ({
        skuId: l.skuId, warehouseId: l.warehouseId, qty: Number(l.qty), unit_price: l.unit_price,
      })),
      cashLegs: cashLegs.filter((c) => c.cashAccountId && c.amount),
    } as Partial<TransactionInput>);
  }, [counterpartyName, customerId, currency, taxRatePercent, lines, cashLegs, onChange]);

  function tryAutoFill(updatedLines: Line[], i: number): Line[] {
    const line = updatedLines[i];
    if (!line.skuId || !line.qty || activeRules.length === 0 || !customerCtx) return updatedLines;
    const result = resolvePriceRule(activeRules, line.skuId, customerCtx, Number(line.qty));
    if (!result) return updatedLines;
    const price = fromMinor(BigInt(result.unit_price_local_minor), currency);
    return updatedLines.map((l, j) => j === i ? { ...l, unit_price: price } : l);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    let updated = lines.map((l, j) => (j === i ? { ...l, ...patch } : l));
    if ("skuId" in patch || "qty" in patch) {
      updated = tryAutoFill(updated, i);
    }
    setLines(updated);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Customer</Label>
          <CustomerLinePicker
            value={customerId}
            onChange={(id, name, partner) => {
              setCustomerId(id);
              setCounterpartyName(name);
              setCustomerCtx(partner
                ? { customer_type_id: partner.customer_type_id, customer_tier_id: partner.customer_tier_id, country: partner.country || null }
                : null);
            }}
            initialPartners={customers}
          />
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => {
            if (v !== null) {
              const next = v as CurrencyCode;
              setCurrency(next);
              setTaxRatePercent(String(DEFAULT_TAX_BASIS_POINTS[next] / 100));
            }
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="taxRatePercent">Tax rate %</Label>
          <Input
            id="taxRatePercent"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={taxRatePercent}
            onChange={(e) => setTaxRatePercent(e.target.value)}
            placeholder={String(DEFAULT_TAX_BASIS_POINTS[currency] / 100)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Tax-inclusive: amounts you type already include this tax.
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Line items {activeRules.length > 0 && <span className="text-xs text-green-600 font-normal ml-1">({activeRules.length} price rule{activeRules.length !== 1 ? "s" : ""} active)</span>}</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setScanOpen(true)}>
              📷 Scan barcodes
            </Button>
            <Button type="button" variant="outline" size="sm"
              onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "" }])}>
              + Add line
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1"><SkuLinePicker value={line.skuId} onChange={(v) => updateLine(i, { skuId: v })} initialSkus={skus} /></div>
              <Select value={line.warehouseId ?? null} onValueChange={(v) => { if (v !== null) updateLine(i, { warehouseId: v }); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Warehouse">
                    {(val: string | null) => {
                      if (!val) return "Warehouse";
                      const w = liveWarehouses.find((x) => x.id === val);
                      return w ? w.name : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>{liveWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Qty" value={line.qty}
                onChange={(e) => updateLine(i, { qty: e.target.value })} className="w-20" />
              <Input type="text" inputMode="decimal" placeholder="Unit price" value={line.unit_price}
                onChange={(e) => updateLine(i, { unit_price: e.target.value })} className="w-28 text-right" />
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Cash received</Label>
        <CashLegRows legs={cashLegs} onChange={setCashLegs} accounts={cashAccounts} filterCurrency={currency} />
      </div>

      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDone={(rows: TallyRow[]) => {
          const existingTyped: FormLine[] = lines
            .filter((l) => l.skuId && l.warehouseId)
            .map((l) => ({ skuId: l.skuId, warehouseId: l.warehouseId, qty: Number(l.qty) || 0, unit_price: l.unit_price }));
          const merged = mergeTally(existingTyped, rows);
          setLines(merged.map((m) => ({ skuId: m.skuId, warehouseId: m.warehouseId, qty: String(m.qty), unit_price: m.unit_price })));
        }}
        initialSkus={skus}
        warehouses={warehouses}
        defaultWarehouseId={lines.find((l) => l.warehouseId)?.warehouseId ?? liveWarehouses[0]?.id}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify build + all tests pass**

```bash
npm run build 2>&1 | grep -E "error TS|✓ Compiled" && npm test 2>&1 | tail -6
```
Expected: `✓ Compiled successfully` and all 48 tests pass.

- [ ] **Step 5: Commit + push**

```bash
git add src/components/forms/CustomerLinePicker.tsx \
  src/components/forms/SaleFields.tsx \
  src/app/\(app\)/new/page.tsx
git commit -m "feat(sale): auto-populate unit_price from pricing rules"
git push origin main
```

---

## Done

After all tasks:
- `/pricing` lets operators manage customer types, tiers, and price rules
- `/customers` shows type/tier for each customer, editable from the form
- `/new` → Sale form fetches active rules when a customer is selected; unit_price fills automatically when SKU + qty are set
- All 48 tests pass, build clean, deployed via `git push origin main`
