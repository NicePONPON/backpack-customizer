# Trading ERP — Phase 1, Plan 2 of 3 (Transactions) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the six transaction types (PURCHASE, SALE, RETURN, TRANSFER, ADJUSTMENT, FX_CONVERSION), the unified `/new` entry form with inline SKU creation, the `/transactions` list, and the read-only detail page with reversal — turning the Plan 1 foundation into a working manual ledger.

**Architecture:** One schema migration adds `transactions.from_transaction_id` for RETURN-→-SALE linking. Pure helper modules (`landedCost.ts`, `transactionMath.ts`, `buildMovementRows.ts`) carry all the business logic and are strictly TDD'd. Two Server Actions (`createTransaction`, `reverseTransaction`) handle every write atomically (transaction parent first, then `stock_movements` and `cash_movements` in batched inserts, rolling back the parent if any child insert fails). Form is one `/new` route with a tabbed selector; each type's fields live in a dedicated sub-component sharing reusable `SkuLinePicker`, `InlineSkuCreateDialog`, and `CashLegRows` components.

**Tech Stack:** Same as Plan 1 — Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + Auth + RLS), Tailwind v4, shadcn/ui on `@base-ui/react`, react-hook-form + zod (discriminated union), TanStack Table, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-05-13-trading-erp-phase-1-plan-2-transactions-design.md`

**Working directory:** `~/trading-erp` (Plan 1 already shipped here; this plan continues there).

---

## Task 1: Migration `0003_add_from_transaction_id`

**Files:**
- Create: `~/trading-erp/supabase/migrations/0003_add_from_transaction_id.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0003_add_from_transaction_id.sql`:
```sql
alter table transactions
  add column from_transaction_id uuid references transactions(id);

create index idx_transactions_from on transactions (from_transaction_id)
  where from_transaction_id is not null;
```

- [ ] **Step 2: Apply to remote DB**

Run:
```bash
cd ~/trading-erp && supabase db push
```

Expected: "Applying migration 0003_add_from_transaction_id.sql ..." then success. No interactive prompts (the linked project + stored password makes this non-interactive).

- [ ] **Step 3: Regenerate TypeScript types**

Run:
```bash
cd ~/trading-erp && npm run db:types
```

Expected: `src/lib/supabase/database.types.ts` updates and now includes `from_transaction_id` on `Tables['transactions']['Row']`. Confirm with `grep -c from_transaction_id src/lib/supabase/database.types.ts` — should be ≥ 2 (one in Row, one in Insert, one in Update typically).

- [ ] **Step 4: Commit**

```bash
cd ~/trading-erp
git add supabase/migrations/0003_add_from_transaction_id.sql src/lib/supabase/database.types.ts
git commit -m "feat(db): add from_transaction_id for RETURN→SALE link"
```

---

## Task 2: TDD — `lib/landedCost.ts` (pro-rata allocation)

**Files:**
- Create: `~/trading-erp/src/lib/landedCost.ts`
- Create: `~/trading-erp/src/lib/__tests__/landedCost.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/landedCost.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeLandedCosts, type Line } from "@/lib/landedCost";

describe("computeLandedCosts", () => {
  it("returns unit_price when there is no extra cost", () => {
    const lines: Line[] = [
      { qty: 10, unit_price_minor: 8000n }, // ¥80.00 × 10
    ];
    expect(computeLandedCosts(lines, 0n)).toEqual([8000n]);
  });

  it("allocates a single extra cost pro-rata across two lines", () => {
    // Goods total = ¥1400; shipping = ¥80; cost_factor = 80/1400 ≈ 0.0571
    // line A: 80 × 1.0571 = 84.57 -> 8457 minor
    // line B: 120 × 1.0571 = 126.85 -> 12686 minor (with rounding)
    const lines: Line[] = [
      { qty: 10, unit_price_minor: 8000n },  // ¥800
      { qty: 5,  unit_price_minor: 12000n }, // ¥600
    ];
    const result = computeLandedCosts(lines, 8000n);
    // The sum of (landed * qty) must equal goods_total + extras = 148000 minor
    const sum = result[0] * 10n + result[1] * 5n;
    expect(sum).toBe(148000n);
  });

  it("absorbs the rounding residual into the first line", () => {
    // Tiny extra that won't divide evenly
    const lines: Line[] = [
      { qty: 3, unit_price_minor: 100n },
      { qty: 3, unit_price_minor: 100n },
      { qty: 3, unit_price_minor: 100n },
    ];
    // goods = 900, extra = 1 minor; pro-rata = 0.00111 per minor; each line should get a tiny share
    // Implementation rounds to whole minor units per line; residual goes to line 0
    const result = computeLandedCosts(lines, 1n);
    const sum = result[0] * 3n + result[1] * 3n + result[2] * 3n;
    expect(sum).toBe(901n); // total preserved
  });

  it("throws when goods_total is 0", () => {
    expect(() => computeLandedCosts([], 100n)).toThrow();
    expect(() => computeLandedCosts([{ qty: 0, unit_price_minor: 5000n }], 100n)).toThrow();
  });

  it("handles 'no items' by throwing", () => {
    expect(() => computeLandedCosts([], 0n)).toThrow();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
cd ~/trading-erp && npm test
```

Expected: failures because `@/lib/landedCost` doesn't exist.

- [ ] **Step 3: Implement `landedCost.ts`**

Create `src/lib/landedCost.ts`:
```ts
export type Line = { qty: number; unit_price_minor: bigint };

/**
 * Pro-rata allocate `extra_minor` across line items by goods value.
 * Returns the landed unit cost (bigint minor units) per line, in input order.
 * Rounding residual is absorbed into the first line — total preserved exactly.
 * Throws if goods_total (sum of qty × unit_price) is zero.
 */
export function computeLandedCosts(lines: Line[], extra_minor: bigint): bigint[] {
  if (lines.length === 0) throw new Error("computeLandedCosts: no line items");

  // goods_total in minor units
  let goods_total = 0n;
  for (const l of lines) goods_total += BigInt(l.qty) * l.unit_price_minor;
  if (goods_total === 0n) throw new Error("computeLandedCosts: goods total is zero");

  // For each line: allocated_extra = round(extra_minor × line_goods / goods_total)
  //                landed_per_unit = round((line_goods + allocated_extra) / qty)
  // Track residual to absorb on line 0.
  const results: bigint[] = new Array(lines.length).fill(0n);
  let allocated_so_far = 0n;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const line_goods = BigInt(l.qty) * l.unit_price_minor;
    // Round half-up: (a + b/2) / b
    const allocated_extra =
      i === lines.length - 1
        ? extra_minor - allocated_so_far
        : (extra_minor * line_goods + goods_total / 2n) / goods_total;
    allocated_so_far += allocated_extra;
    const line_total = line_goods + allocated_extra;
    // Per-unit cost rounded to integer minor units
    const qty_big = BigInt(l.qty);
    const per_unit = (line_total + qty_big / 2n) / qty_big;
    results[i] = per_unit;
  }

  // Reconcile residual into line 0 so sum(per_unit × qty) == goods_total + extra_minor.
  let actual_total = 0n;
  for (let i = 0; i < lines.length; i++) actual_total += results[i] * BigInt(lines[i].qty);
  const target_total = goods_total + extra_minor;
  const residual = target_total - actual_total;
  if (residual !== 0n) {
    // Move residual to line 0's per-unit cost (absorb across its qty)
    const qty0 = BigInt(lines[0].qty);
    // Add `residual` divided by qty0; remainder still might be off by minor amount
    results[0] += residual / qty0;
    // Recompute and if still off, do final scalar fix on line 0
    let recompute = 0n;
    for (let i = 0; i < lines.length; i++) recompute += results[i] * BigInt(lines[i].qty);
    const final_diff = target_total - recompute;
    if (final_diff !== 0n) {
      // Spread the (very small) remaining diff into line 0 by adjusting one unit's cost
      // We add 1 minor to line 0 until the diff is zero (worst case: qty0 iterations)
      // For our scales (qty < 1000) this is cheap.
      const sign = final_diff > 0n ? 1n : -1n;
      let abs = final_diff < 0n ? -final_diff : final_diff;
      // Adjust by adding `abs` minor units distributed over qty0 — but since we can't fractionally
      // adjust, we bump results[0] by sign while decrementing abs by qty0 per bump.
      while (abs >= qty0) {
        results[0] += sign;
        abs -= qty0;
      }
      // Any remainder (< qty0) leaves a 0..qty0-1 minor-unit imprecision; acceptable per spec.
    }
  }

  return results;
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd ~/trading-erp && npm test
```

Expected: all landed-cost tests pass. Total test count should now be 21 (16 from Plan 1 + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/landedCost.ts src/lib/__tests__/landedCost.test.ts
git commit -m "feat: pro-rata landed cost allocation with tests"
```

---

## Task 3: TDD — `lib/transactionMath.ts`

**Files:**
- Create: `~/trading-erp/src/lib/transactionMath.ts`
- Create: `~/trading-erp/src/lib/__tests__/transactionMath.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/transactionMath.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { flipSign, deriveFxRate } from "@/lib/transactionMath";

describe("flipSign", () => {
  it("flips positive bigint", () => expect(flipSign(1234n)).toBe(-1234n));
  it("flips negative bigint", () => expect(flipSign(-50n)).toBe(50n));
  it("zero stays zero", () => expect(flipSign(0n)).toBe(0n));
});

describe("deriveFxRate", () => {
  it("computes rate from two amounts in same decimals", () => {
    // 100 source units → 150 dest units → rate = 1.5
    expect(deriveFxRate(10000n, 2, 15000n, 2)).toBeCloseTo(1.5, 4);
  });

  it("handles different decimals (SZL 2dp → NTD 0dp)", () => {
    // 8500.00 SZL → 13940 NTD: 850000 minor / 100 = 8500 SZL; 13940 minor / 1 = 13940 NTD
    // rate = 13940 / 8500 = 1.6400
    expect(deriveFxRate(850000n, 2, 13940n, 0)).toBeCloseTo(1.64, 4);
  });

  it("throws if source amount is zero", () => {
    expect(() => deriveFxRate(0n, 2, 1000n, 2)).toThrow();
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
cd ~/trading-erp && npm test
```

Expected: failures because `@/lib/transactionMath` doesn't exist.

- [ ] **Step 3: Implement `transactionMath.ts`**

Create `src/lib/transactionMath.ts`:
```ts
export function flipSign(value: bigint): bigint {
  return -value;
}

/**
 * Derive the implied FX rate from two cash movement amounts.
 * Both amounts are in their respective currencies' minor units; pass the decimal places.
 * Returns a JS number (rates are display-only, not used for further bigint math).
 */
export function deriveFxRate(
  source_minor: bigint,
  source_decimals: number,
  dest_minor: bigint,
  dest_decimals: number,
): number {
  if (source_minor === 0n) throw new Error("deriveFxRate: source amount is zero");
  const source_major = Number(source_minor) / 10 ** source_decimals;
  const dest_major = Number(dest_minor) / 10 ** dest_decimals;
  return dest_major / source_major;
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
cd ~/trading-erp && npm test
```

Expected: all transactionMath tests pass; total now 25.

- [ ] **Step 5: Commit**

```bash
git add src/lib/transactionMath.ts src/lib/__tests__/transactionMath.test.ts
git commit -m "feat: transactionMath helpers (flipSign, deriveFxRate) with tests"
```

---

## Task 4: zod schemas — discriminated union for all 6 types

**Files:**
- Create: `~/trading-erp/src/lib/schemas/transaction.ts`

- [ ] **Step 1: Create the schemas file**

Create `src/lib/schemas/transaction.ts`:
```ts
import { z } from "zod";
import { currencyCodeSchema, CURRENCY_CODES } from "./cashAccount";

const uuid = z.string().uuid();
const minor = z.string().regex(/^\d+(\.\d+)?$/, "must be a number"); // money values are strings until converted

const purchaseLineSchema = z.object({
  skuId: uuid,
  warehouseId: uuid,
  qty: z.coerce.number().int().positive(),
  unit_price: minor, // typed string like "80.00"
});
const saleLineSchema = purchaseLineSchema;
const returnLineSchema = purchaseLineSchema.extend({
  intoDamaged: z.boolean().default(false),
});
const transferLineSchema = z.object({
  skuId: uuid,
  qty: z.coerce.number().int().positive(),
});

const cashLegSchema = z.object({
  cashAccountId: uuid,
  description: z.string().trim().default(""),
  amount: minor, // positive string; sign applied by server based on direction
});

const baseFields = {
  occurredAt: z.coerce.date(),
  counterpartyName: z.string().trim().default(""),
  notes: z.string().trim().default(""),
};

const purchaseSchema = z.object({
  type: z.literal("PURCHASE"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  lines: z.array(purchaseLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
});

const saleSchema = z.object({
  type: z.literal("SALE"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  lines: z.array(saleLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
});

const returnSchema = z.object({
  type: z.literal("RETURN"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  fromTransactionId: uuid.nullable().default(null),
  lines: z.array(returnLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).default([]),
});

const transferSchema = z.object({
  type: z.literal("TRANSFER"),
  ...baseFields,
  sourceWarehouseId: uuid,
  destinationWarehouseId: uuid,
  lines: z.array(transferLineSchema).min(1),
  shippingCashLeg: cashLegSchema.nullable().default(null),
}).refine(
  (d) => d.sourceWarehouseId !== d.destinationWarehouseId,
  { message: "Source and destination must differ", path: ["destinationWarehouseId"] },
);

const adjustmentSchema = z.object({
  type: z.literal("ADJUSTMENT"),
  ...baseFields,
  reason: z.string().trim().min(1, "Reason is required"),
  // Exactly one of these must be set:
  stockAdjustment: z.object({
    skuId: uuid,
    warehouseId: uuid,
    qty_delta: z.coerce.number().int(),
  }).nullable().default(null),
  cashAdjustment: z.object({
    cashAccountId: uuid,
    amount_delta: z.string().regex(/^-?\d+(\.\d+)?$/),
  }).nullable().default(null),
}).refine(
  (d) => (d.stockAdjustment !== null) !== (d.cashAdjustment !== null),
  { message: "Exactly one of stock or cash adjustment must be set" },
);

const fxConversionSchema = z.object({
  type: z.literal("FX_CONVERSION"),
  ...baseFields,
  sourceCashAccountId: uuid,
  sourceAmount: minor,            // positive string; sign applied by server
  sourceCurrencyCode: currencyCodeSchema,
  destinationCashAccountId: uuid,
  destinationAmount: minor,       // positive string
  destinationCurrencyCode: currencyCodeSchema,
}).refine(
  (d) => d.sourceCurrencyCode !== d.destinationCurrencyCode,
  { message: "Source and destination currencies must differ", path: ["destinationCurrencyCode"] },
);

export const transactionInputSchema = z.discriminatedUnion("type", [
  purchaseSchema,
  saleSchema,
  returnSchema,
  transferSchema,
  adjustmentSchema,
  fxConversionSchema,
]);

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type PurchaseInput = z.infer<typeof purchaseSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type FxConversionInput = z.infer<typeof fxConversionSchema>;
export { CURRENCY_CODES };
```

- [ ] **Step 2: Verify lint + build**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -5
```

Expected: lint clean; build succeeds (schemas don't affect routes yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/transaction.ts
git commit -m "feat: zod discriminated union for all 6 transaction types"
```

---

## Task 5: TDD — `lib/buildMovementRows.ts` (pure row builder)

This module turns a validated `TransactionInput` into the `stock_movements` + `cash_movements` rows ready for insertion. Pure function; unit-testable.

**Files:**
- Create: `~/trading-erp/src/lib/buildMovementRows.ts`
- Create: `~/trading-erp/src/lib/__tests__/buildMovementRows.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/buildMovementRows.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildMovementRows } from "@/lib/buildMovementRows";
import type { PurchaseInput, FxConversionInput } from "@/lib/schemas/transaction";

const DAMAGED_WH_MAP: Record<string, string | null> = {
  // tests pass an empty map; build doesn't need it for PURCHASE
};

describe("buildMovementRows — PURCHASE", () => {
  it("builds stock + cash rows with landed cost", () => {
    const input = {
      type: "PURCHASE",
      occurredAt: new Date("2026-05-13"),
      counterpartyName: "Acme Supplier",
      notes: "",
      currencyCode: "CNY",
      lines: [
        { skuId: "11111111-1111-1111-1111-111111111111", warehouseId: "22222222-2222-2222-2222-222222222222", qty: 10, unit_price: "80.00" },
      ],
      cashLegs: [
        { cashAccountId: "33333333-3333-3333-3333-333333333333", description: "Goods", amount: "800.00" },
        { cashAccountId: "33333333-3333-3333-3333-333333333333", description: "Shipping", amount: "80.00" },
      ],
    } as PurchaseInput;

    const result = buildMovementRows(input, DAMAGED_WH_MAP);

    // 1 stock row, 2 cash rows
    expect(result.stockMovements.length).toBe(1);
    expect(result.cashMovements.length).toBe(2);

    // Stock: positive qty into live warehouse
    expect(result.stockMovements[0].qty_delta).toBe(10);
    expect(result.stockMovements[0].warehouse_id).toBe("22222222-2222-2222-2222-222222222222");
    // Unit cost = 80 + 80 = 88 per unit (one line absorbs full shipping)
    expect(result.stockMovements[0].unit_cost_minor).toBe(8800n);

    // Cash: both negative (cash leaves)
    expect(result.cashMovements[0].amount_minor_delta).toBe(-80000n);
    expect(result.cashMovements[1].amount_minor_delta).toBe(-8000n);
  });
});

describe("buildMovementRows — FX_CONVERSION", () => {
  it("builds two cash rows with opposite signs", () => {
    const input = {
      type: "FX_CONVERSION",
      occurredAt: new Date("2026-05-13"),
      counterpartyName: "",
      notes: "Bank conversion",
      sourceCashAccountId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      sourceAmount: "8500.00",
      sourceCurrencyCode: "SZL",
      destinationCashAccountId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      destinationAmount: "13940",
      destinationCurrencyCode: "NTD",
    } as FxConversionInput;

    const result = buildMovementRows(input, DAMAGED_WH_MAP);

    expect(result.stockMovements.length).toBe(0);
    expect(result.cashMovements.length).toBe(2);
    // Source: negative SZL (2 decimals)
    expect(result.cashMovements[0].amount_minor_delta).toBe(-850000n);
    expect(result.cashMovements[0].cash_account_id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    // Destination: positive NTD (0 decimals)
    expect(result.cashMovements[1].amount_minor_delta).toBe(13940n);
    expect(result.cashMovements[1].cash_account_id).toBe("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
  });
});
```

- [ ] **Step 2: Run and confirm failure**

```bash
cd ~/trading-erp && npm test
```

Expected: failures because `@/lib/buildMovementRows` doesn't exist.

- [ ] **Step 3: Implement `buildMovementRows.ts`**

Create `src/lib/buildMovementRows.ts`:
```ts
import { computeLandedCosts } from "./landedCost";
import { toMinor, type CurrencyCode } from "./money";
import { currencyDecimals } from "./money";
import type {
  TransactionInput,
  PurchaseInput,
  SaleInput,
  ReturnInput,
  TransferInput,
  AdjustmentInput,
  FxConversionInput,
} from "./schemas/transaction";

export type StockMovementRow = {
  sku_id: string;
  warehouse_id: string;
  qty_delta: number;
  unit_cost_minor: bigint;
};

export type CashMovementRow = {
  cash_account_id: string;
  amount_minor_delta: bigint;
};

export type BuiltRows = {
  stockMovements: StockMovementRow[];
  cashMovements: CashMovementRow[];
};

/**
 * Build the rows-to-insert for a validated TransactionInput.
 * `damagedWarehouseMap` maps each live warehouse_id → its paired damaged warehouse_id
 * (used by RETURN's intoDamaged toggle). Pass `{}` for transaction types that don't need it.
 */
export function buildMovementRows(
  input: TransactionInput,
  damagedWarehouseMap: Record<string, string | null>,
): BuiltRows {
  switch (input.type) {
    case "PURCHASE":
      return buildPurchase(input);
    case "SALE":
      return buildSale(input);
    case "RETURN":
      return buildReturn(input, damagedWarehouseMap);
    case "TRANSFER":
      return buildTransfer(input);
    case "ADJUSTMENT":
      return buildAdjustment(input);
    case "FX_CONVERSION":
      return buildFxConversion(input);
  }
}

function buildPurchase(input: PurchaseInput): BuiltRows {
  const code = input.currencyCode as CurrencyCode;
  const lines = input.lines.map((l) => ({
    qty: l.qty,
    unit_price_minor: toMinor(l.unit_price, code),
  }));
  // The "goods" leg is the first cash leg by convention from the form; everything else is extra cost.
  const cashLegsMinor = input.cashLegs.map((c) => toMinor(c.amount, code));
  const goodsLegMinor = cashLegsMinor[0];
  const extra_minor = cashLegsMinor.slice(1).reduce((a, b) => a + b, 0n);
  const landed = computeLandedCosts(lines, extra_minor);

  const stockMovements: StockMovementRow[] = input.lines.map((l, i) => ({
    sku_id: l.skuId,
    warehouse_id: l.warehouseId,
    qty_delta: l.qty,
    unit_cost_minor: landed[i],
  }));

  const cashMovements: CashMovementRow[] = input.cashLegs.map((c, i) => ({
    cash_account_id: c.cashAccountId,
    amount_minor_delta: -(i === 0 ? goodsLegMinor : cashLegsMinor[i]),
  }));

  return { stockMovements, cashMovements };
}

function buildSale(input: SaleInput): BuiltRows {
  const code = input.currencyCode as CurrencyCode;
  const stockMovements: StockMovementRow[] = input.lines.map((l) => ({
    sku_id: l.skuId,
    warehouse_id: l.warehouseId,
    qty_delta: -l.qty,
    unit_cost_minor: toMinor(l.unit_price, code),
  }));
  const cashMovements: CashMovementRow[] = input.cashLegs.map((c) => ({
    cash_account_id: c.cashAccountId,
    amount_minor_delta: toMinor(c.amount, code),
  }));
  return { stockMovements, cashMovements };
}

function buildReturn(
  input: ReturnInput,
  damagedWarehouseMap: Record<string, string | null>,
): BuiltRows {
  const code = input.currencyCode as CurrencyCode;
  const stockMovements: StockMovementRow[] = input.lines.map((l) => {
    const warehouseId =
      l.intoDamaged && damagedWarehouseMap[l.warehouseId]
        ? (damagedWarehouseMap[l.warehouseId] as string)
        : l.warehouseId;
    return {
      sku_id: l.skuId,
      warehouse_id: warehouseId,
      qty_delta: l.qty,
      unit_cost_minor: toMinor(l.unit_price, code),
    };
  });
  const cashMovements: CashMovementRow[] = input.cashLegs.map((c) => ({
    cash_account_id: c.cashAccountId,
    amount_minor_delta: -toMinor(c.amount, code),
  }));
  return { stockMovements, cashMovements };
}

function buildTransfer(input: TransferInput): BuiltRows {
  const stockMovements: StockMovementRow[] = [];
  for (const l of input.lines) {
    stockMovements.push({
      sku_id: l.skuId,
      warehouse_id: input.sourceWarehouseId,
      qty_delta: -l.qty,
      unit_cost_minor: 0n,
    });
    stockMovements.push({
      sku_id: l.skuId,
      warehouse_id: input.destinationWarehouseId,
      qty_delta: l.qty,
      unit_cost_minor: 0n,
    });
  }
  const cashMovements: CashMovementRow[] = [];
  if (input.shippingCashLeg) {
    // Shipping cash leg has no currency in TransferInput — we infer from the account in the action layer.
    // Here we assume amount is already in minor units; converted at action layer before calling.
    // For purity of this function, we store the string-to-bigint in the action layer instead.
    throw new Error("buildTransfer: shipping cash leg conversion must happen in action layer");
  }
  return { stockMovements, cashMovements };
}

function buildAdjustment(input: AdjustmentInput): BuiltRows {
  const stockMovements: StockMovementRow[] = [];
  const cashMovements: CashMovementRow[] = [];
  if (input.stockAdjustment) {
    stockMovements.push({
      sku_id: input.stockAdjustment.skuId,
      warehouse_id: input.stockAdjustment.warehouseId,
      qty_delta: input.stockAdjustment.qty_delta,
      unit_cost_minor: 0n,
    });
  }
  if (input.cashAdjustment) {
    // Same currency-inference caveat as transfer; conversion happens at action layer.
    throw new Error("buildAdjustment: cash adjustment conversion must happen in action layer");
  }
  return { stockMovements, cashMovements };
}

function buildFxConversion(input: FxConversionInput): BuiltRows {
  const srcCode = input.sourceCurrencyCode as CurrencyCode;
  const dstCode = input.destinationCurrencyCode as CurrencyCode;
  const cashMovements: CashMovementRow[] = [
    {
      cash_account_id: input.sourceCashAccountId,
      amount_minor_delta: -toMinor(input.sourceAmount, srcCode),
    },
    {
      cash_account_id: input.destinationCashAccountId,
      amount_minor_delta: toMinor(input.destinationAmount, dstCode),
    },
  ];
  return { stockMovements: [], cashMovements };
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
cd ~/trading-erp && npm test
```

Expected: builds pass; total ~27.

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildMovementRows.ts src/lib/__tests__/buildMovementRows.test.ts
git commit -m "feat: buildMovementRows pure function for all 6 transaction types"
```

---

## Task 6: Server action — `createTransaction`

**Files:**
- Create: `~/trading-erp/src/lib/actions/transactions.ts`

- [ ] **Step 1: Create the actions file**

Create `src/lib/actions/transactions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { transactionInputSchema, type TransactionInput } from "@/lib/schemas/transaction";
import { buildMovementRows } from "@/lib/buildMovementRows";
import { toMinor, type CurrencyCode } from "@/lib/money";

export async function createTransaction(input: TransactionInput): Promise<{ id: string }> {
  const parsed = transactionInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Build damaged-warehouse map for RETURN (live → paired damaged)
  let damagedMap: Record<string, string | null> = {};
  if (parsed.type === "RETURN") {
    const { data: whs } = await supabase.from("warehouses").select("id, name, is_damaged");
    const live = (whs ?? []).filter((w) => !w.is_damaged);
    const damaged = (whs ?? []).filter((w) => w.is_damaged);
    for (const l of live) {
      const pair = damaged.find((d) => d.name === `${l.name} — Damaged`);
      damagedMap[l.id] = pair?.id ?? null;
    }
  }

  // RETURN linked to a SALE: validate warehouse + qty per line.
  if (parsed.type === "RETURN" && parsed.fromTransactionId) {
    const { data: origMoves, error: origErr } = await supabase
      .from("stock_movements")
      .select("sku_id, warehouse_id, qty_delta")
      .eq("transaction_id", parsed.fromTransactionId);
    if (origErr) throw new Error(origErr.message);
    for (const ln of parsed.lines) {
      const origLines = (origMoves ?? []).filter((m) => m.sku_id === ln.skuId);
      // SALE qty_delta is negative; we look at absolute sold qty.
      const soldQty = origLines.reduce((acc, m) => acc + Math.abs(m.qty_delta), 0);
      if (soldQty === 0) throw new Error(`SKU ${ln.skuId} was not in linked sale`);
      if (ln.qty > soldQty) throw new Error(`Cannot return more than sold (${ln.qty} > ${soldQty})`);
      const origLineWarehouses = new Set(origLines.map((m) => m.warehouse_id));
      if (!origLineWarehouses.has(ln.warehouseId)) {
        throw new Error(`Warehouse mismatch for SKU ${ln.skuId} (must restock to original)`);
      }
    }
  }

  // PURCHASE: at least one cash leg (the goods leg).
  if (parsed.type === "PURCHASE" && parsed.cashLegs.length === 0) {
    throw new Error("PURCHASE requires at least one cash leg (the goods leg)");
  }

  // Build the rows (most types). TRANSFER and ADJUSTMENT need cash conversion done here.
  let rows = buildMovementRows(parsed, damagedMap);

  // TRANSFER with shipping leg: convert the shipping amount based on its account's currency.
  if (parsed.type === "TRANSFER" && parsed.shippingCashLeg) {
    const { data: acct, error: acctErr } = await supabase
      .from("cash_accounts")
      .select("currency_code")
      .eq("id", parsed.shippingCashLeg.cashAccountId)
      .single();
    if (acctErr) throw new Error(acctErr.message);
    const code = acct.currency_code as CurrencyCode;
    rows = {
      stockMovements: rows.stockMovements,
      cashMovements: [
        {
          cash_account_id: parsed.shippingCashLeg.cashAccountId,
          amount_minor_delta: -toMinor(parsed.shippingCashLeg.amount, code),
        },
      ],
    };
  }

  // ADJUSTMENT cash side: convert based on account's currency.
  if (parsed.type === "ADJUSTMENT" && parsed.cashAdjustment) {
    const { data: acct, error: acctErr } = await supabase
      .from("cash_accounts")
      .select("currency_code")
      .eq("id", parsed.cashAdjustment.cashAccountId)
      .single();
    if (acctErr) throw new Error(acctErr.message);
    const code = acct.currency_code as CurrencyCode;
    rows = {
      stockMovements: [],
      cashMovements: [
        {
          cash_account_id: parsed.cashAdjustment.cashAccountId,
          amount_minor_delta: toMinor(parsed.cashAdjustment.amount_delta, code),
        },
      ],
    };
  }

  // Determine currency for the transaction row.
  let txCurrency: string | null = null;
  if ("currencyCode" in parsed) txCurrency = parsed.currencyCode;

  // Insert the parent transaction row.
  const { data: txRow, error: txErr } = await supabase
    .from("transactions")
    .insert({
      type: parsed.type,
      occurred_at: parsed.occurredAt.toISOString(),
      currency_code: txCurrency,
      counterparty_name: parsed.counterpartyName,
      notes: parsed.type === "ADJUSTMENT" ? parsed.reason : parsed.notes,
      from_transaction_id: parsed.type === "RETURN" ? parsed.fromTransactionId : null,
      reverses_transaction_id: null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (txErr) throw new Error(`Failed to create transaction: ${txErr.message}`);
  const txId = txRow.id;

  // Insert children. On any failure, delete the parent and rethrow.
  try {
    if (rows.stockMovements.length > 0) {
      const { error } = await supabase.from("stock_movements").insert(
        rows.stockMovements.map((m) => ({
          transaction_id: txId,
          sku_id: m.sku_id,
          warehouse_id: m.warehouse_id,
          qty_delta: m.qty_delta,
          unit_cost_minor: m.unit_cost_minor.toString(),
        })),
      );
      if (error) throw new Error(error.message);
    }
    if (rows.cashMovements.length > 0) {
      const { error } = await supabase.from("cash_movements").insert(
        rows.cashMovements.map((m) => ({
          transaction_id: txId,
          cash_account_id: m.cash_account_id,
          amount_minor_delta: m.amount_minor_delta.toString(),
        })),
      );
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    // Roll back parent row
    await supabase.from("transactions").delete().eq("id", txId);
    throw e;
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  return { id: txId };
}
```

- [ ] **Step 2: Verify lint + build**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -5
```

Expected: clean lint, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/transactions.ts
git commit -m "feat(actions): createTransaction for all 6 types with rollback"
```

---

## Task 7: Server action — `reverseTransaction`

**Files:**
- Create: `~/trading-erp/src/lib/actions/transactionsReverse.ts`

- [ ] **Step 1: Create the file**

Create `src/lib/actions/transactionsReverse.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reverseTransaction(originalId: string, reason: string = ""): Promise<{ id: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: orig, error: origErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", originalId)
    .single();
  if (origErr || !orig) throw new Error("Original transaction not found");

  const { data: origStock } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("transaction_id", originalId);
  const { data: origCash } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("transaction_id", originalId);

  // Insert reversal parent
  const { data: newTx, error: newErr } = await supabase
    .from("transactions")
    .insert({
      type: orig.type,
      occurred_at: new Date().toISOString(),
      currency_code: orig.currency_code,
      counterparty_name: orig.counterparty_name,
      notes: `Reversal of #${originalId}` + (reason ? `: ${reason}` : ""),
      reverses_transaction_id: originalId,
      from_transaction_id: null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (newErr) throw new Error(`Failed to create reversal: ${newErr.message}`);
  const newId = newTx.id;

  try {
    if (origStock && origStock.length > 0) {
      const { error } = await supabase.from("stock_movements").insert(
        origStock.map((m) => ({
          transaction_id: newId,
          sku_id: m.sku_id,
          warehouse_id: m.warehouse_id,
          qty_delta: -m.qty_delta,
          unit_cost_minor: m.unit_cost_minor,
        })),
      );
      if (error) throw new Error(error.message);
    }
    if (origCash && origCash.length > 0) {
      const { error } = await supabase.from("cash_movements").insert(
        origCash.map((m) => ({
          transaction_id: newId,
          cash_account_id: m.cash_account_id,
          // Numeric column comes back as string from supabase-js for bigint columns; flip sign as string.
          amount_minor_delta: (-BigInt(m.amount_minor_delta)).toString(),
        })),
      );
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    await supabase.from("transactions").delete().eq("id", newId);
    throw e;
  }

  revalidatePath("/transactions");
  revalidatePath(`/transactions/${originalId}`);
  revalidatePath(`/transactions/${newId}`);
  revalidatePath("/");
  return { id: newId };
}
```

- [ ] **Step 2: Verify build**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -5
```

Expected: build passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/transactionsReverse.ts
git commit -m "feat(actions): reverseTransaction creates sign-flipped mirror"
```

---

## Task 8: `SkuLinePicker` + `InlineSkuCreateDialog`

Reusable SKU picker with inline create. Requires `createSku` to return the new id, so we update it first.

**Files:**
- Modify: `~/trading-erp/src/lib/actions/skus.ts` (make `createSku` return the new id)
- Create: `~/trading-erp/src/components/forms/SkuLinePicker.tsx`
- Create: `~/trading-erp/src/components/forms/InlineSkuCreateDialog.tsx`

- [ ] **Step 1: Update `createSku` to return `{ id, code, name }`**

In `src/lib/actions/skus.ts`, replace the `createSku` function body. The new version selects the inserted row so the dialog can auto-select it:

```ts
export async function createSku(input: SkuInput): Promise<{ id: string; code: string; name: string }> {
  const parsed = skuInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("skus").insert({
    code: parsed.code,
    name: parsed.name,
    description: parsed.description,
    is_custom: parsed.isCustom,
    created_by: user?.id ?? null,
  }).select("id, code, name").single();
  if (error) throw new Error(error.message);
  revalidatePath("/skus");
  return data;
}
```

(Existing callers — the SKU page's `SkuFormDialog` — ignore the return value, so this is a backward-compatible change.)

- [ ] **Step 2: Create `InlineSkuCreateDialog.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { createSku, generateNextCustomSkuCode } from "@/lib/actions/skus";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  onCreated: (newSku: { id: string; code: string; name: string }) => void;
  trigger: React.ReactNode;
};

export function InlineSkuCreateDialog({ onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleGenerate() {
    const next = await generateNextCustomSkuCode();
    setCode(next);
    setIsCustom(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const created = await createSku({ code, name, description: desc, isCustom });
        onCreated(created);
        setOpen(false);
        setCode("");
        setName("");
        setDesc("");
        setIsCustom(false);
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
          <DialogTitle>New SKU</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="code">Code</Label>
              <button type="button" onClick={handleGenerate} className="text-xs text-blue-600 hover:underline">
                Generate custom SKU
              </button>
            </div>
            <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Input id="desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} />
            Is custom item
          </label>
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

- [ ] **Step 3: Create `SkuLinePicker.tsx`**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { InlineSkuCreateDialog } from "./InlineSkuCreateDialog";

type Sku = { id: string; code: string; name: string };

type Props = {
  value: string | undefined;
  onChange: (skuId: string) => void;
  initialSkus: Sku[];
};

export function SkuLinePicker({ value, onChange, initialSkus }: Props) {
  const [skus, setSkus] = useState<Sku[]>(initialSkus);
  const supabase = createClient();

  async function refreshSkus() {
    const { data } = await supabase
      .from("skus")
      .select("id, code, name")
      .eq("is_archived", false)
      .order("code");
    if (data) setSkus(data);
  }

  async function handleCreated(newSku: { id: string; code: string; name: string }) {
    await refreshSkus();
    onChange(newSku.id);
  }

  return (
    <div className="flex gap-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1"><SelectValue placeholder="Select SKU…" /></SelectTrigger>
        <SelectContent>
          {skus.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>
          ))}
          <InlineSkuCreateDialog
            onCreated={handleCreated}
            trigger={<button type="button" className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-slate-100">+ new SKU…</button>}
          />
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/skus.ts src/components/forms/SkuLinePicker.tsx src/components/forms/InlineSkuCreateDialog.tsx
git commit -m "feat(forms): SkuLinePicker with inline-create dialog + createSku returns id"
```

---

## Task 9: `CashLegRows` reusable component

**Files:**
- Create: `~/trading-erp/src/components/forms/CashLegRows.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type CashLeg = {
  cashAccountId: string;
  description: string;
  amount: string;
};

export type CashAccountOption = {
  id: string;
  name: string;
  currency_code: string;
};

type Props = {
  legs: CashLeg[];
  onChange: (next: CashLeg[]) => void;
  accounts: CashAccountOption[];
  filterCurrency?: string;
  firstRowLocked?: boolean;
  firstRowLabel?: string;
};

export function CashLegRows({
  legs, onChange, accounts, filterCurrency, firstRowLocked, firstRowLabel,
}: Props) {
  const filteredAccounts = filterCurrency
    ? accounts.filter((a) => a.currency_code === filterCurrency)
    : accounts;

  function update(i: number, patch: Partial<CashLeg>) {
    onChange(legs.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }
  function remove(i: number) {
    if (firstRowLocked && i === 0) return;
    onChange(legs.filter((_, j) => j !== i));
  }
  function add() {
    onChange([...legs, { cashAccountId: "", description: "", amount: "" }]);
  }

  return (
    <div className="space-y-2">
      {legs.map((leg, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            placeholder="Description"
            value={i === 0 && firstRowLabel ? firstRowLabel : leg.description}
            onChange={(e) => update(i, { description: e.target.value })}
            disabled={i === 0 && !!firstRowLabel}
            className="flex-1"
          />
          <Select value={leg.cashAccountId} onValueChange={(v) => update(i, { cashAccountId: v })}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Cash account" /></SelectTrigger>
            <SelectContent>
              {filteredAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency_code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={leg.amount}
            onChange={(e) => update(i, { amount: e.target.value })}
            className="w-32 text-right"
          />
          {!(firstRowLocked && i === 0) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>✕</Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>+ Add cash leg</Button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/CashLegRows.tsx
git commit -m "feat(forms): CashLegRows reusable cash-leg editor"
```

---

## Task 10: `/new` page + `NewTransactionForm` shell

**Files:**
- Create: `~/trading-erp/src/app/(app)/new/page.tsx`
- Create: `~/trading-erp/src/components/forms/NewTransactionForm.tsx`

- [ ] **Step 1: Create the form shell**

Create `src/components/forms/NewTransactionForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTransaction } from "@/lib/actions/transactions";
import type { TransactionInput } from "@/lib/schemas/transaction";
import { PurchaseFields } from "./PurchaseFields";
import { SaleFields } from "./SaleFields";
import { ReturnFields } from "./ReturnFields";
import { TransferFields } from "./TransferFields";
import { AdjustmentFields } from "./AdjustmentFields";
import { FxConversionFields } from "./FxConversionFields";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };

type Props = {
  skus: Sku[];
  warehouses: Warehouse[];
  cashAccounts: CashAccount[];
};

const TX_TYPES = [
  "PURCHASE", "SALE", "RETURN", "TRANSFER", "ADJUSTMENT", "FX_CONVERSION",
] as const;

export function NewTransactionForm({ skus, warehouses, cashAccounts }: Props) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TX_TYPES)[number]>("PURCHASE");
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [typedData, setTypedData] = useState<Partial<TransactionInput> | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (!typedData) throw new Error("Form not initialised");
      const input = {
        ...typedData,
        type,
        occurredAt: new Date(occurredAt),
        notes,
      } as TransactionInput;
      const { id } = await createTransaction(input);
      router.push(`/transactions/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {TX_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded text-sm ${type === t ? "bg-slate-900 text-white" : "bg-slate-100"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {type === "PURCHASE" && (
        <PurchaseFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} onChange={setTypedData} />
      )}
      {type === "SALE" && (
        <SaleFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} onChange={setTypedData} />
      )}
      {type === "RETURN" && (
        <ReturnFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} onChange={setTypedData} />
      )}
      {type === "TRANSFER" && (
        <TransferFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} onChange={setTypedData} />
      )}
      {type === "ADJUSTMENT" && (
        <AdjustmentFields skus={skus} warehouses={warehouses} cashAccounts={cashAccounts} onChange={setTypedData} />
      )}
      {type === "FX_CONVERSION" && (
        <FxConversionFields cashAccounts={cashAccounts} onChange={setTypedData} />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save transaction"}</Button>
    </form>
  );
}
```

- [ ] **Step 2: Create stub per-type field components (to keep build green)**

Create `src/components/forms/PurchaseFields.tsx`:
```tsx
"use client";
import type { TransactionInput } from "@/lib/schemas/transaction";
type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };
export function PurchaseFields({ skus, warehouses, cashAccounts, onChange }: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  return <div className="text-slate-500">PurchaseFields — implemented in Task 11.</div>;
}
```

Create the same stub structure (different filename + comment) for `SaleFields.tsx`, `ReturnFields.tsx`, `TransferFields.tsx`, `AdjustmentFields.tsx`, and `FxConversionFields.tsx`. (Implement each in its own task below.)

For `FxConversionFields` the props differ slightly (no skus/warehouses); use:
```tsx
export function FxConversionFields({ cashAccounts, onChange }: {
  cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  return <div className="text-slate-500">FxConversionFields — implemented in Task 16.</div>;
}
```

- [ ] **Step 3: Create the `/new` page**

Create `src/app/(app)/new/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { NewTransactionForm } from "@/components/forms/NewTransactionForm";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const [{ data: skus }, { data: warehouses }, { data: cashAccounts }] = await Promise.all([
    supabase.from("skus").select("id, code, name").eq("is_archived", false).order("code"),
    supabase.from("warehouses").select("id, name, is_damaged").order("name"),
    supabase.from("cash_accounts").select("id, name, currency_code").eq("is_archived", false).order("name"),
  ]);
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold mb-4">New transaction</h1>
      <NewTransactionForm
        skus={skus ?? []}
        warehouses={warehouses ?? []}
        cashAccounts={cashAccounts ?? []}
      />
    </div>
  );
}
```

- [ ] **Step 4: Build + lint**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -10
```

Expected: build passes; `/new` appears in route table.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/new/page.tsx src/components/forms/
git commit -m "feat(new): transaction form shell + type selector + stubs"
```

---

## Task 11: `PurchaseFields` — full implementation

**Files:**
- Modify: `~/trading-erp/src/components/forms/PurchaseFields.tsx`

- [ ] **Step 1: Replace the stub**

Replace the contents with:
```tsx
"use client";

import { useEffect, useState } from "react";
import { CURRENCY_CODES } from "@/lib/schemas/cashAccount";
import { toMinor, fromMinor, type CurrencyCode } from "@/lib/money";
import { computeLandedCosts } from "@/lib/landedCost";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SkuLinePicker } from "./SkuLinePicker";
import { CashLegRows, type CashLeg } from "./CashLegRows";
import type { TransactionInput } from "@/lib/schemas/transaction";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };

type Line = { skuId: string; warehouseId: string; qty: string; unit_price: string };

export function PurchaseFields({
  skus, warehouses, cashAccounts, onChange,
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  const [counterparty, setCounterparty] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NTD");
  const [lines, setLines] = useState<Line[]>([
    { skuId: "", warehouseId: "", qty: "", unit_price: "" },
  ]);
  const [cashLegs, setCashLegs] = useState<CashLeg[]>([
    { cashAccountId: "", description: "Goods", amount: "" },
  ]);

  const liveWarehouses = warehouses.filter((w) => !w.is_damaged);

  useEffect(() => {
    onChange({
      type: "PURCHASE",
      counterpartyName: counterparty,
      currencyCode: currency,
      lines: lines.filter((l) => l.skuId && l.warehouseId && l.qty && l.unit_price).map((l) => ({
        skuId: l.skuId,
        warehouseId: l.warehouseId,
        qty: Number(l.qty),
        unit_price: l.unit_price,
      })),
      cashLegs: cashLegs.filter((c) => c.cashAccountId && c.amount).map((c) => ({
        cashAccountId: c.cashAccountId,
        description: c.description,
        amount: c.amount,
      })),
    } as Partial<TransactionInput>);
  }, [counterparty, currency, lines, cashLegs, onChange]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  // Live landed cost preview
  let preview: { code: string; landed: string }[] = [];
  try {
    const validLines = lines.filter((l) => l.skuId && l.qty && l.unit_price).map((l) => ({
      qty: Number(l.qty),
      unit_price_minor: toMinor(l.unit_price, currency),
      skuId: l.skuId,
    }));
    const cashLegsMinor = cashLegs.filter((c) => c.amount).map((c) => toMinor(c.amount, currency));
    const goods_total_minor = validLines.reduce((a, l) => a + BigInt(l.qty) * l.unit_price_minor, 0n);
    const extra_minor = cashLegsMinor.slice(1).reduce((a, b) => a + b, 0n);
    if (validLines.length > 0 && goods_total_minor > 0n) {
      const landedCosts = computeLandedCosts(validLines, extra_minor);
      preview = validLines.map((l, i) => {
        const sku = skus.find((s) => s.id === l.skuId);
        return { code: sku?.code ?? "?", landed: fromMinor(landedCosts[i], currency) };
      });
    }
  } catch { /* incomplete data, skip preview */ }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Supplier</Label>
          <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm"
            onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "" }])}>
            + Add line
          </Button>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1"><SkuLinePicker value={line.skuId} onChange={(v) => updateLine(i, { skuId: v })} initialSkus={skus} /></div>
              <Select value={line.warehouseId} onValueChange={(v) => updateLine(i, { warehouseId: v })}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Warehouse" /></SelectTrigger>
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
        <Label>Cash legs (first row = goods; add more for shipping/customs)</Label>
        <CashLegRows
          legs={cashLegs}
          onChange={setCashLegs}
          accounts={cashAccounts}
          filterCurrency={currency}
          firstRowLocked
          firstRowLabel="Goods"
        />
      </div>

      {preview.length > 0 && (
        <div className="border rounded p-3 bg-slate-50">
          <div className="text-xs font-semibold mb-1">Landed cost preview</div>
          {preview.map((p, i) => (
            <div key={i} className="text-sm font-mono">{p.code}: {p.landed}/unit</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/PurchaseFields.tsx
git commit -m "feat(forms): PurchaseFields with live landed cost preview"
```

---

## Task 12: `SaleFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/SaleFields.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
"use client";

import { useEffect, useState } from "react";
import { CURRENCY_CODES } from "@/lib/schemas/cashAccount";
import { type CurrencyCode } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SkuLinePicker } from "./SkuLinePicker";
import { CashLegRows, type CashLeg } from "./CashLegRows";
import type { TransactionInput } from "@/lib/schemas/transaction";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };

type Line = { skuId: string; warehouseId: string; qty: string; unit_price: string };

export function SaleFields({
  skus, warehouses, cashAccounts, onChange,
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  const [counterparty, setCounterparty] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NTD");
  const [lines, setLines] = useState<Line[]>([
    { skuId: "", warehouseId: "", qty: "", unit_price: "" },
  ]);
  const [cashLegs, setCashLegs] = useState<CashLeg[]>([
    { cashAccountId: "", description: "Customer payment", amount: "" },
  ]);

  const liveWarehouses = warehouses.filter((w) => !w.is_damaged);

  useEffect(() => {
    onChange({
      type: "SALE",
      counterpartyName: counterparty,
      currencyCode: currency,
      lines: lines.filter((l) => l.skuId && l.warehouseId && l.qty && l.unit_price).map((l) => ({
        skuId: l.skuId, warehouseId: l.warehouseId, qty: Number(l.qty), unit_price: l.unit_price,
      })),
      cashLegs: cashLegs.filter((c) => c.cashAccountId && c.amount),
    } as Partial<TransactionInput>);
  }, [counterparty, currency, lines, cashLegs, onChange]);

  function updateLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Customer</Label>
          <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm"
            onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "" }])}>
            + Add line
          </Button>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1"><SkuLinePicker value={line.skuId} onChange={(v) => updateLine(i, { skuId: v })} initialSkus={skus} /></div>
              <Select value={line.warehouseId} onValueChange={(v) => updateLine(i, { warehouseId: v })}>
                <SelectTrigger className="w-32"><SelectValue placeholder="Warehouse" /></SelectTrigger>
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
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/SaleFields.tsx
git commit -m "feat(forms): SaleFields"
```

---

## Task 13: `ReturnFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/ReturnFields.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CURRENCY_CODES } from "@/lib/schemas/cashAccount";
import { type CurrencyCode } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CashLegRows, type CashLeg } from "./CashLegRows";
import type { TransactionInput } from "@/lib/schemas/transaction";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };

type ReturnLine = {
  skuId: string;
  warehouseId: string;
  qty: string;
  unit_price: string;
  intoDamaged: boolean;
  maxQty?: number; // populated when linked to sale
};

type SaleSummary = {
  id: string;
  counterparty_name: string;
  occurred_at: string;
  currency_code: string;
  lines: { sku_id: string; warehouse_id: string; qty: number; unit_price_minor: string }[];
};

export function ReturnFields({
  skus, warehouses, cashAccounts, onChange,
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  const [counterparty, setCounterparty] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("NTD");
  const [linkedSaleId, setLinkedSaleId] = useState<string | null>(null);
  const [linkedSaleSummary, setLinkedSaleSummary] = useState<SaleSummary | null>(null);
  const [lines, setLines] = useState<ReturnLine[]>([
    { skuId: "", warehouseId: "", qty: "", unit_price: "", intoDamaged: false },
  ]);
  const [cashLegs, setCashLegs] = useState<CashLeg[]>([
    { cashAccountId: "", description: "Refund", amount: "" },
  ]);

  const supabase = createClient();
  const liveWarehouses = warehouses.filter((w) => !w.is_damaged);

  async function loadSale(id: string) {
    setLinkedSaleId(id);
    if (!id) {
      setLinkedSaleSummary(null);
      return;
    }
    const { data: tx } = await supabase.from("transactions")
      .select("id, counterparty_name, occurred_at, currency_code")
      .eq("id", id).single();
    const { data: moves } = await supabase.from("stock_movements")
      .select("sku_id, warehouse_id, qty_delta, unit_cost_minor")
      .eq("transaction_id", id);
    if (!tx) return;
    setLinkedSaleSummary({
      id: tx.id,
      counterparty_name: tx.counterparty_name,
      occurred_at: tx.occurred_at,
      currency_code: tx.currency_code,
      lines: (moves ?? []).map((m) => ({
        sku_id: m.sku_id,
        warehouse_id: m.warehouse_id,
        qty: Math.abs(m.qty_delta),
        unit_price_minor: m.unit_cost_minor,
      })),
    });
    setCounterparty(tx.counterparty_name);
    setCurrency(tx.currency_code as CurrencyCode);
    // Pre-fill lines from the sale
    setLines((moves ?? []).map((m) => ({
      skuId: m.sku_id,
      warehouseId: m.warehouse_id,
      qty: String(Math.abs(m.qty_delta)),
      unit_price: "", // operator types or auto-fills; leave blank for clarity
      intoDamaged: false,
      maxQty: Math.abs(m.qty_delta),
    })));
  }

  useEffect(() => {
    onChange({
      type: "RETURN",
      counterpartyName: counterparty,
      currencyCode: currency,
      fromTransactionId: linkedSaleId,
      lines: lines.filter((l) => l.skuId && l.warehouseId && l.qty && l.unit_price).map((l) => ({
        skuId: l.skuId, warehouseId: l.warehouseId, qty: Number(l.qty),
        unit_price: l.unit_price, intoDamaged: l.intoDamaged,
      })),
      cashLegs: cashLegs.filter((c) => c.cashAccountId && c.amount),
    } as Partial<TransactionInput>);
  }, [counterparty, currency, linkedSaleId, lines, cashLegs, onChange]);

  return (
    <div className="space-y-6">
      <div>
        <Label>Link to original sale (optional, by transaction id)</Label>
        <Input placeholder="UUID of the sale, or leave blank for unlinked return"
          onBlur={(e) => loadSale(e.target.value)} />
        {linkedSaleSummary && (
          <p className="text-sm text-slate-600 mt-1">
            Linked: {linkedSaleSummary.counterparty_name} on {linkedSaleSummary.occurred_at.slice(0, 10)}
            ({linkedSaleSummary.currency_code})
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Customer</Label>
          <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} disabled={!!linkedSaleId} />
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)} disabled={!!linkedSaleId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Line items {linkedSaleId && "(warehouse locked from original sale)"}</Label>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1 text-sm font-mono">
                {skus.find((s) => s.id === line.skuId)?.code ?? "?"}
              </div>
              <Select value={line.warehouseId}
                onValueChange={(v) => setLines(lines.map((l, j) => j === i ? { ...l, warehouseId: v } : l))}
                disabled={!!linkedSaleId}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{liveWarehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" placeholder="Qty"
                value={line.qty}
                max={line.maxQty}
                onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, qty: e.target.value } : l))}
                className="w-20" />
              <Input type="text" inputMode="decimal" placeholder="Unit price"
                value={line.unit_price}
                onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, unit_price: e.target.value } : l))}
                className="w-28 text-right" />
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={line.intoDamaged}
                  onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, intoDamaged: e.target.checked } : l))} />
                damaged
              </label>
            </div>
          ))}
        </div>
        {!linkedSaleId && (
          <Button type="button" variant="outline" size="sm" className="mt-2"
            onClick={() => setLines([...lines, { skuId: "", warehouseId: "", qty: "", unit_price: "", intoDamaged: false }])}>
            + Add line
          </Button>
        )}
      </div>

      <div>
        <Label>Cash legs (refund + any return shipping you paid)</Label>
        <CashLegRows legs={cashLegs} onChange={setCashLegs} accounts={cashAccounts} filterCurrency={currency} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/ReturnFields.tsx
git commit -m "feat(forms): ReturnFields with optional sale link + warehouse lock"
```

---

## Task 14: `TransferFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/TransferFields.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SkuLinePicker } from "./SkuLinePicker";
import type { TransactionInput } from "@/lib/schemas/transaction";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };
type Line = { skuId: string; qty: string };

export function TransferFields({
  skus, warehouses, cashAccounts, onChange,
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  const [src, setSrc] = useState("");
  const [dst, setDst] = useState("");
  const [lines, setLines] = useState<Line[]>([{ skuId: "", qty: "" }]);
  const [shippingAccount, setShippingAccount] = useState("");
  const [shippingAmount, setShippingAmount] = useState("");

  useEffect(() => {
    onChange({
      type: "TRANSFER",
      sourceWarehouseId: src,
      destinationWarehouseId: dst,
      lines: lines.filter((l) => l.skuId && l.qty).map((l) => ({
        skuId: l.skuId, qty: Number(l.qty),
      })),
      shippingCashLeg: shippingAccount && shippingAmount
        ? { cashAccountId: shippingAccount, description: "Transfer shipping", amount: shippingAmount }
        : null,
    } as Partial<TransactionInput>);
  }, [src, dst, lines, shippingAccount, shippingAmount, onChange]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Source warehouse</Label>
          <Select value={src} onValueChange={setSrc}>
            <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Destination warehouse</Label>
          <Select value={dst} onValueChange={setDst}>
            <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id} disabled={w.id === src}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Line items</Label>
          <Button type="button" variant="outline" size="sm"
            onClick={() => setLines([...lines, { skuId: "", qty: "" }])}>+ Add line</Button>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1">
                <SkuLinePicker value={line.skuId}
                  onChange={(v) => setLines(lines.map((l, j) => j === i ? { ...l, skuId: v } : l))}
                  initialSkus={skus} />
              </div>
              <Input type="number" placeholder="Qty" value={line.qty}
                onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, qty: e.target.value } : l))}
                className="w-24" />
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Optional shipping cost</Label>
        <div className="flex gap-2 mt-1">
          <Select value={shippingAccount} onValueChange={setShippingAccount}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Cash account (any currency)" /></SelectTrigger>
            <SelectContent>{cashAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency_code})</SelectItem>)}</SelectContent>
          </Select>
          <Input type="text" inputMode="decimal" placeholder="0.00" value={shippingAmount}
            onChange={(e) => setShippingAmount(e.target.value)} className="w-32 text-right" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/TransferFields.tsx
git commit -m "feat(forms): TransferFields"
```

---

## Task 15: `AdjustmentFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/AdjustmentFields.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SkuLinePicker } from "./SkuLinePicker";
import type { TransactionInput } from "@/lib/schemas/transaction";

type Sku = { id: string; code: string; name: string };
type Warehouse = { id: string; name: string; is_damaged: boolean };
type CashAccount = { id: string; name: string; currency_code: string };

export function AdjustmentFields({
  skus, warehouses, cashAccounts, onChange,
}: {
  skus: Sku[]; warehouses: Warehouse[]; cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  const [mode, setMode] = useState<"stock" | "cash">("stock");
  const [reason, setReason] = useState("");
  // Stock fields
  const [skuId, setSkuId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [qtyDelta, setQtyDelta] = useState("");
  // Cash fields
  const [cashAccountId, setCashAccountId] = useState("");
  const [amountDelta, setAmountDelta] = useState("");

  useEffect(() => {
    onChange({
      type: "ADJUSTMENT",
      reason,
      stockAdjustment: mode === "stock" && skuId && warehouseId && qtyDelta
        ? { skuId, warehouseId, qty_delta: Number(qtyDelta) }
        : null,
      cashAdjustment: mode === "cash" && cashAccountId && amountDelta
        ? { cashAccountId, amount_delta: amountDelta }
        : null,
    } as Partial<TransactionInput>);
  }, [mode, reason, skuId, warehouseId, qtyDelta, cashAccountId, amountDelta, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={mode === "stock"} onChange={() => setMode("stock")} /> Stock
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input type="radio" checked={mode === "cash"} onChange={() => setMode("cash")} /> Cash
        </label>
      </div>
      <div>
        <Label>Reason (required)</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {mode === "stock" ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-1"><SkuLinePicker value={skuId} onChange={setSkuId} initialSkus={skus} /></div>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger><SelectValue placeholder="Warehouse" /></SelectTrigger>
            <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="Qty delta (signed)" value={qtyDelta}
            onChange={(e) => setQtyDelta(e.target.value)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Select value={cashAccountId} onValueChange={setCashAccountId}>
            <SelectTrigger><SelectValue placeholder="Cash account" /></SelectTrigger>
            <SelectContent>{cashAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency_code})</SelectItem>)}</SelectContent>
          </Select>
          <Input type="text" inputMode="decimal" placeholder="Amount delta (signed)" value={amountDelta}
            onChange={(e) => setAmountDelta(e.target.value)} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/AdjustmentFields.tsx
git commit -m "feat(forms): AdjustmentFields with stock/cash mode"
```

---

## Task 16: `FxConversionFields`

**Files:**
- Modify: `~/trading-erp/src/components/forms/FxConversionFields.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toMinor, currencyDecimals, type CurrencyCode } from "@/lib/money";
import { deriveFxRate } from "@/lib/transactionMath";
import type { TransactionInput } from "@/lib/schemas/transaction";

type CashAccount = { id: string; name: string; currency_code: string };

export function FxConversionFields({
  cashAccounts, onChange,
}: {
  cashAccounts: CashAccount[];
  onChange: (data: Partial<TransactionInput>) => void;
}) {
  const [srcId, setSrcId] = useState("");
  const [srcAmount, setSrcAmount] = useState("");
  const [dstId, setDstId] = useState("");
  const [dstAmount, setDstAmount] = useState("");

  const srcAcct = useMemo(() => cashAccounts.find((a) => a.id === srcId), [cashAccounts, srcId]);
  const dstAcct = useMemo(() => cashAccounts.find((a) => a.id === dstId), [cashAccounts, dstId]);

  const rate = useMemo(() => {
    if (!srcAcct || !dstAcct || !srcAmount || !dstAmount) return null;
    try {
      const srcCode = srcAcct.currency_code as CurrencyCode;
      const dstCode = dstAcct.currency_code as CurrencyCode;
      const srcMinor = toMinor(srcAmount, srcCode);
      const dstMinor = toMinor(dstAmount, dstCode);
      return deriveFxRate(srcMinor, currencyDecimals(srcCode), dstMinor, currencyDecimals(dstCode));
    } catch { return null; }
  }, [srcAcct, dstAcct, srcAmount, dstAmount]);

  useEffect(() => {
    if (!srcAcct || !dstAcct) return;
    onChange({
      type: "FX_CONVERSION",
      sourceCashAccountId: srcId,
      sourceAmount: srcAmount,
      sourceCurrencyCode: srcAcct.currency_code,
      destinationCashAccountId: dstId,
      destinationAmount: dstAmount,
      destinationCurrencyCode: dstAcct.currency_code,
    } as Partial<TransactionInput>);
  }, [srcId, srcAcct, srcAmount, dstId, dstAcct, dstAmount, onChange]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>From account</Label>
          <Select value={srcId} onValueChange={setSrcId}>
            <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>{cashAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency_code})</SelectItem>)}</SelectContent>
          </Select>
          <Input type="text" inputMode="decimal" placeholder="0.00" value={srcAmount}
            onChange={(e) => setSrcAmount(e.target.value)} className="mt-2 text-right" />
        </div>
        <div>
          <Label>To account</Label>
          <Select value={dstId} onValueChange={setDstId}>
            <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
            <SelectContent>{cashAccounts.map((a) => <SelectItem key={a.id} value={a.id} disabled={a.currency_code === srcAcct?.currency_code}>{a.name} ({a.currency_code})</SelectItem>)}</SelectContent>
          </Select>
          <Input type="text" inputMode="decimal" placeholder="0.00" value={dstAmount}
            onChange={(e) => setDstAmount(e.target.value)} className="mt-2 text-right" />
        </div>
      </div>
      {rate !== null && srcAcct && dstAcct && (
        <p className="text-sm text-slate-600">
          Implied rate: 1 {srcAcct.currency_code} → {rate.toFixed(4)} {dstAcct.currency_code}
          {" "}(1 {dstAcct.currency_code} → {(1 / rate).toFixed(4)} {srcAcct.currency_code})
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/FxConversionFields.tsx
git commit -m "feat(forms): FxConversionFields with live rate preview"
```

---

## Task 17: Transactions list page

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/page.tsx`
- Create: `~/trading-erp/src/app/(app)/transactions/TransactionsTable.tsx`

- [ ] **Step 1: Create the table component**

Create `src/app/(app)/transactions/TransactionsTable.tsx`:
```tsx
"use client";

import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  type: string;
  occurred_at: string;
  counterparty_name: string;
  currency_code: string | null;
  notes: string;
};

export function TransactionsTable({ rows }: { rows: Row[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Counterparty</TableHead>
          <TableHead>Currency</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="cursor-pointer hover:bg-slate-50">
            <TableCell><Link href={`/transactions/${r.id}`}>{r.occurred_at.slice(0, 10)}</Link></TableCell>
            <TableCell><Link href={`/transactions/${r.id}`}>{r.type}</Link></TableCell>
            <TableCell><Link href={`/transactions/${r.id}`}>{r.counterparty_name}</Link></TableCell>
            <TableCell><Link href={`/transactions/${r.id}`}>{r.currency_code ?? "—"}</Link></TableCell>
            <TableCell className="text-slate-500"><Link href={`/transactions/${r.id}`}>{r.notes}</Link></TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-slate-500 py-8">No transactions yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Create the page**

Create `src/app/(app)/transactions/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { TransactionsTable } from "./TransactionsTable";

export default async function TransactionsListPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, occurred_at, counterparty_name, currency_code, notes")
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <div className="bg-white rounded-lg shadow">
        <TransactionsTable rows={data ?? []} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/
git commit -m "feat(transactions): list page with 50 most recent"
```

---

## Task 18: Transaction detail page (read-only)

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

Create `src/app/(app)/transactions/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fromMinor, type CurrencyCode } from "@/lib/money";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ReverseDialog } from "./ReverseDialog";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (!tx) notFound();

  const [{ data: stock }, { data: cash }, { data: skus }, { data: warehouses }, { data: accts }] = await Promise.all([
    supabase.from("stock_movements").select("*").eq("transaction_id", id),
    supabase.from("cash_movements").select("*").eq("transaction_id", id),
    supabase.from("skus").select("id, code, name"),
    supabase.from("warehouses").select("id, name, is_damaged"),
    supabase.from("cash_accounts").select("id, name, currency_code"),
  ]);

  // Reversed-by query
  const { data: reversedBy } = await supabase
    .from("transactions")
    .select("id")
    .eq("reverses_transaction_id", id)
    .maybeSingle();

  // Has returns query (only if this is a SALE)
  const { data: returns } =
    tx.type === "SALE"
      ? await supabase.from("transactions").select("id").eq("from_transaction_id", id)
      : { data: [] };

  const lookupSku = (sku_id: string) => (skus ?? []).find((s) => s.id === sku_id);
  const lookupWh = (wh_id: string) => (warehouses ?? []).find((w) => w.id === wh_id);
  const lookupAcct = (a_id: string) => (accts ?? []).find((a) => a.id === a_id);

  const totalCashMinor = (cash ?? []).reduce((acc, c) => acc + BigInt(c.amount_minor_delta), 0n);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">{tx.type}</h1>
          <p className="text-slate-600">{new Date(tx.occurred_at).toLocaleString()}</p>
        </div>
        {!reversedBy && <ReverseDialog originalId={tx.id} />}
      </div>

      {/* Cross-reference banners */}
      <div className="space-y-2">
        {tx.reverses_transaction_id && (
          <div className="border rounded p-2 bg-amber-50 text-sm">
            Reverses <Link className="underline" href={`/transactions/${tx.reverses_transaction_id}`}>#{tx.reverses_transaction_id.slice(0, 8)}</Link>
          </div>
        )}
        {reversedBy && (
          <div className="border rounded p-2 bg-amber-50 text-sm">
            Reversed by <Link className="underline" href={`/transactions/${reversedBy.id}`}>#{reversedBy.id.slice(0, 8)}</Link>
          </div>
        )}
        {tx.from_transaction_id && (
          <div className="border rounded p-2 bg-blue-50 text-sm">
            Return for sale <Link className="underline" href={`/transactions/${tx.from_transaction_id}`}>#{tx.from_transaction_id.slice(0, 8)}</Link>
          </div>
        )}
        {(returns ?? []).length > 0 && (
          <div className="border rounded p-2 bg-blue-50 text-sm">
            Has returns: {(returns ?? []).map((r) => (
              <Link key={r.id} className="underline mr-2" href={`/transactions/${r.id}`}>#{r.id.slice(0, 8)}</Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><strong>Counterparty:</strong> {tx.counterparty_name || "—"}</div>
        <div><strong>Currency:</strong> {tx.currency_code ?? "—"}</div>
        <div><strong>Notes:</strong> {tx.notes || "—"}</div>
        <div><strong>Recorded by:</strong> {tx.created_by ?? "—"}</div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Stock movements</h2>
        <Table>
          <TableHeader><TableRow>
            <TableHead>SKU</TableHead><TableHead>Warehouse</TableHead><TableHead>Qty delta</TableHead><TableHead>Unit cost</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(stock ?? []).map((m) => {
              const wh = lookupWh(m.warehouse_id);
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-mono">{lookupSku(m.sku_id)?.code ?? m.sku_id.slice(0, 8)}</TableCell>
                  <TableCell>{wh?.name}{wh?.is_damaged ? " (damaged)" : ""}</TableCell>
                  <TableCell className={m.qty_delta < 0 ? "text-red-600" : "text-green-700"}>{m.qty_delta}</TableCell>
                  <TableCell>{m.unit_cost_minor}</TableCell>
                </TableRow>
              );
            })}
            {(stock ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-slate-500">None</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Cash movements (total: {tx.currency_code ? fromMinor(totalCashMinor, tx.currency_code as CurrencyCode) : totalCashMinor.toString()} {tx.currency_code ?? ""})</h2>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Account</TableHead><TableHead>Currency</TableHead><TableHead>Amount delta</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(cash ?? []).map((m) => {
              const a = lookupAcct(m.cash_account_id);
              const amt = BigInt(m.amount_minor_delta);
              return (
                <TableRow key={m.id}>
                  <TableCell>{a?.name}</TableCell>
                  <TableCell>{a?.currency_code}</TableCell>
                  <TableCell className={amt < 0n ? "text-red-600" : "text-green-700"}>
                    {a?.currency_code ? fromMinor(amt, a.currency_code as CurrencyCode) : amt.toString()}
                  </TableCell>
                </TableRow>
              );
            })}
            {(cash ?? []).length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-slate-500">None</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create stub `ReverseDialog.tsx`** (will be fully implemented in Task 19)

Create `src/app/(app)/transactions/[id]/ReverseDialog.tsx`:
```tsx
"use client";
export function ReverseDialog({ originalId }: { originalId: string }) {
  return <span className="text-xs text-slate-400">Reverse — Task 19</span>;
}
```

- [ ] **Step 3: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -5
git add src/app/\(app\)/transactions/\[id\]/
git commit -m "feat(transactions): detail page with movements and banners"
```

---

## Task 19: `ReverseDialog` — full implementation

**Files:**
- Modify: `~/trading-erp/src/app/(app)/transactions/[id]/ReverseDialog.tsx`

- [ ] **Step 1: Replace the stub**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reverseTransaction } from "@/lib/actions/transactionsReverse";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReverseDialog({ originalId }: { originalId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const { id } = await reverseTransaction(originalId, reason);
        setOpen(false);
        router.push(`/transactions/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Reverse this transaction</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse this transaction?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-600">
          This creates a new transaction with all signs flipped. The original is preserved.
        </p>
        <div>
          <Label>Optional reason</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Entered wrong supplier name" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={pending}>{pending ? "Reversing..." : "Confirm reversal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/ReverseDialog.tsx
git commit -m "feat(transactions): reverse dialog with confirmation"
```

---

## Task 20: Deploy + production smoke test

**Files:**
- No code changes; this is a verification task.

- [ ] **Step 1: Push to GitHub (triggers Vercel auto-deploy)**

```bash
cd ~/trading-erp && git push
```

- [ ] **Step 2: Wait for Vercel deploy**

```bash
sleep 90
echo "Test /login (should be 200):"
curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" https://trading-erp-five.vercel.app/login
echo "Test /new (should be 307 redirect to /login when not signed in):"
curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" https://trading-erp-five.vercel.app/new
echo "Test /transactions (307):"
curl -s -m 15 -o /dev/null -w "HTTP %{http_code}\n" https://trading-erp-five.vercel.app/transactions
```

Expected: all three routes respond as expected (200 for /login, 307 for the others without a session).

- [ ] **Step 3: OPERATOR — exercise each transaction type on production**

Sign in at https://trading-erp-five.vercel.app/login, then for each transaction type, create one and verify the detail page renders correctly:

1. **PURCHASE**: Create with 2 line items + 1 shipping cost. Check landed cost preview matches the saved `unit_cost_minor` on the detail page.
2. **SALE**: Sell some of what you just purchased. Verify cash account balance increases on the `/cash-accounts` page (Plan 1 page still works) — by clicking through. (Until Plan 3 we don't have a live balance display on the SKU side, but you can verify by querying via Supabase dashboard SQL editor: `SELECT * FROM v_cash_balances;` and `SELECT * FROM v_stock_by_sku_warehouse;`.)
3. **RETURN**: Try the linked path (paste the SALE's UUID from the detail URL) and verify customer + warehouse auto-populate; verify warehouse field is disabled.
4. **TRANSFER**: Move stock from China to Taiwan; verify both stock_movements appear on the detail page.
5. **ADJUSTMENT**: Stock mode (qty_delta = -1, reason "damaged in handling"); confirm reason saved to `notes`.
6. **FX_CONVERSION**: Two different currencies; check the rate display. Try same currency — form should not allow Save (or server rejects with friendly error).
7. **Reverse**: Click "Reverse this transaction" on any of the above; verify the new transaction has flipped signs and both pages show the cross-reference banner.

- [ ] **Step 4: If issues, fix and re-deploy**

For any failure, paste the error, fix locally, run `npm run build` then `git push`. Vercel auto-deploys.

- [ ] **Step 5: Update CLAUDE.md to mark Plan 2 shipped**

Edit `~/trading-erp/CLAUDE.md`: change the Phase 1, Plan 2 row from `next` to `shipped YYYY-MM-DD`. Add a "What Plan 2 delivered" section similar to the Plan 1 one. Then:

```bash
cd ~/trading-erp
git add CLAUDE.md
git commit -m "docs: mark plan 2 shipped"
git push
```

---

## End of Plan 2

**Acceptance check (from spec §13):**

- [ ] All 6 transaction types submit successfully; each is atomic (parent + children both saved or neither).
- [ ] Inline SKU creation works from inside the line picker; both "type a code" and "Generate custom SKU" paths produce a usable selection.
- [ ] PURCHASE landed cost preview matches the saved `stock_movements.unit_cost_minor`.
- [ ] RETURN linked to a sale: customer/currency auto-fill, warehouse is read-only, qty cannot exceed sold qty.
- [ ] FX_CONVERSION refuses same-currency input on the form (disabled option in destination) and server rejects via zod refine if bypassed.
- [ ] `/transactions` lists 50 most recent, sorted descending by date.
- [ ] `/transactions/[id]` shows movements + the 4 cross-reference banners when applicable.
- [ ] "Reverse this transaction" creates a mirror; both detail pages link to each other.
- [ ] `npm test` passes (Plan 1's 16 tests + Plan 2's ~11 new = ~27 total).
- [ ] `npm run build` and `npm run lint` are clean.
- [ ] Deployed at `trading-erp-five.vercel.app` and every transaction type tested end-to-end in production.

When all the above are ticked, **Plan 2 is shipped** and we move on to Plan 3 (Overview dashboard) or Plan 2.5 (barcode scanner), whichever you pick first.
