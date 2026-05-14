# Trading ERP — Phase 1, Plan 2.6 Design (Suppliers + Customers)

**Date:** 2026-05-14
**Status:** Draft pending user review
**Scope:** Phase 1, Plan 2.6. Two new partner tables (`suppliers`, `customers`) with CRUD pages and inline-create pickers wired into PURCHASE / SALE / RETURN transaction forms. Replaces free-text counterparty inputs with proper records while keeping the free-text fallback for legacy and unlinked use.

> **Note:** Plan 1 shipped 2026-05-13. Plan 2 + Plan 2.5 shipped 2026-05-14. This spec lives in `backpack-customizer/docs/superpowers/specs/` for continuity with earlier plans; should eventually move into the `trading-erp` repo.

**Reference docs:**
- Phase 1 umbrella spec: `2026-05-12-trading-erp-phase-1-design.md`
- Plan 2 spec: `2026-05-13-trading-erp-phase-1-plan-2-transactions-design.md`
- Plan 2.5 spec: `2026-05-14-trading-erp-phase-1-plan-2.5-barcode-scan-design.md`

---

## 1. Purpose

The transaction forms currently store the counterparty name as a free-text string (`transactions.counterparty_name`). This works for one-off transactions but breaks down as soon as the operator has repeat suppliers or customers: each one must be re-typed, typos pile up, contact info has to live in spreadsheets or memory, and reports can't group by partner reliably.

Plan 2.6 adds first-class **supplier** and **customer** records, with full contact metadata, CRUD pages, and inline-create pickers on the transaction forms. The free-text `counterparty_name` column **stays** as a fallback for legacy transactions and for cases where the operator doesn't want to create a record (e.g. one-off cash sale to a tourist).

### What Plan 2.6 builds

1. Two new tables: `suppliers` and `customers`, identical schema, separate rows.
2. Two CRUD pages: `/suppliers` and `/customers` — mirror the existing `/skus` and `/cash-accounts` pages from Plan 1.
3. Two new pickers: `SupplierLinePicker`, `CustomerLinePicker` — mirror the `SkuLinePicker` pattern (Select + adjacent `+` button for inline create).
4. A shared `InlinePartnerCreateDialog` — minimal 2-field create (name + country) for speed during a transaction; the other 6 optional fields get filled later from the full page.
5. New nullable foreign keys on `transactions`: `supplier_id`, `customer_id`. Indexed (partial, where not null) for cheap lookups.
6. Wiring: PURCHASE form's Supplier text input → `SupplierLinePicker`. SALE form's Customer input → `CustomerLinePicker`. RETURN form's Customer input → `CustomerLinePicker`, auto-locked when the RETURN is linked to a sale (mirrors the warehouse-lock behavior added in Plan 2).
7. Sidebar nav: two new entries.
8. Transaction detail page: counterparty name now sourced from the linked partner row when an FK is set, else falls back to `counterparty_name` text.

### Out of scope (deferred)

- **Customer tier / category** (RETAIL / WHOLESALE / VIP) — this is part of Phase 2 (pricing engine). Operator can use the `notes` field as informal categorization today.
- **Per-supplier default payment terms / preferred currency** — Phase 2.
- **Partner detail pages** (`/suppliers/<id>`) — list-only for now. The transaction detail page shows the partner name as plain text; clicking does nothing.
- **Email validation** — `email` is free text. Operator may enter LINE IDs, WeChat IDs, or non-email contacts.
- **Backfill of existing transactions** — none required. Old transactions keep `counterparty_name` and have `null` FKs.
- **Merging two records** that turn out to be the same entity — defer. For now, archive one and update transactions manually if needed.
- **Combined / dual-role partner table** — explicitly rejected during brainstorm. Two tables.

---

## 2. Confirmed design decisions

These are the resolutions of the Plan 2.6 brainstorm and are binding.

### 2.1. Two separate tables (not one combined `partners`)

`suppliers` and `customers` are stored separately. The transaction's `supplier_id` and `customer_id` FK columns point unambiguously at their respective tables. If a real-world entity does business with you as both buyer and seller, you create two records — one in each table. The duplication is honest because the supplier-relationship and customer-relationship usually have different contact people, payment terms, and addresses anyway.

### 2.2. Only `name` is required

All other fields are optional, default to empty string in the DB. The inline-create dialog asks only for `name` + `country` for speed. The full 8-field form lives on the CRUD page.

### 2.3. Free-text `counterparty_name` stays as a fallback

The existing `transactions.counterparty_name` column is preserved. When an operator picks a partner from the picker, BOTH the FK (`supplier_id` or `customer_id`) AND `counterparty_name` are written. The string is set to the partner's `name` at save time. This means:
- Historical transactions keep their counterparty label even if the partner is later renamed.
- Reports can still GROUP BY `counterparty_name` for back-compat with pre-2.6 data.
- Transactions where the operator typed the name without picking a partner still work — FKs are nullable.

### 2.4. RETURN linked to a sale: customer is locked

When a RETURN's `from_transaction_id` is set (linked to an original sale), the customer picker auto-populates from the sale's `customer_id` and is **read-only**, mirroring the warehouse-lock behavior already in Plan 2. If the linked sale had no customer (free-text only or pre-2.6), the RETURN inherits the free-text `counterparty_name` from the sale.

### 2.5. No tier / category field on customers

Adding a dropdown that does nothing today is a YAGNI violation. Phase 2's pricing engine will introduce the column when it actually consumes it. Until then, the `notes` field is the place to write "VIP" or "wholesale" if the operator wants to remember.

---

## 3. Schema migration

Single file: `supabase/migrations/0005_add_partners.sql`.

```sql
-- Suppliers
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default '',
  contact_person text not null default '',
  email text not null default '',
  phone text not null default '',
  tax_id text not null default '',
  address text not null default '',
  notes text not null default '',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default '',
  contact_person text not null default '',
  email text not null default '',
  phone text not null default '',
  tax_id text not null default '',
  address text not null default '',
  notes text not null default '',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- FK columns on transactions; counterparty_name string column stays as-is
alter table transactions
  add column supplier_id uuid references suppliers(id),
  add column customer_id uuid references customers(id);

create index idx_transactions_supplier on transactions (supplier_id)
  where supplier_id is not null;
create index idx_transactions_customer on transactions (customer_id)
  where customer_id is not null;

-- RLS — match Plan 1's permissive policy. Allowlist gating is server-side at /login.
alter table suppliers enable row level security;
alter table customers enable row level security;

create policy "auth full access" on suppliers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth full access" on customers
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

**Defaults are empty string, not NULL.** Simplifies the form code (no `?? ""` everywhere) and keeps the API surface symmetric. `name` is the only `not null` without a default — the form must always provide one.

Type regen via `npm run db:types` after `supabase db push`. If the PAT is unavailable (as in earlier plans), patch `src/lib/supabase/database.types.ts` manually.

---

## 4. zod schemas

Single shared file: `src/lib/schemas/partner.ts`.

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

// Two named aliases — same shape, distinct identifiers help static analysis
// catch "passed a supplier to a customer action" mistakes.
export const supplierInputSchema = partnerInputSchema;
export const customerInputSchema = partnerInputSchema;
export type SupplierInput = PartnerInput;
export type CustomerInput = PartnerInput;
```

**Email is not validated as `z.string().email()`** — operator may enter empty strings, LINE / WeChat handles, or other non-email contacts. Length cap is sufficient.

### Transaction schema additions

In `src/lib/schemas/transaction.ts`, the discriminated union for PURCHASE / SALE / RETURN gains optional FK fields:

```ts
const uuid = z.string().uuid();

const purchaseSchema = z.object({
  // ...existing fields...
  supplierId: uuid.nullable().default(null),
});

const saleSchema = z.object({
  // ...existing fields...
  customerId: uuid.nullable().default(null),
});

const returnSchema = z.object({
  // ...existing fields...
  customerId: uuid.nullable().default(null),
});
```

TRANSFER, ADJUSTMENT, FX_CONVERSION are unchanged.

---

## 5. Server actions

Two new files: `src/lib/actions/suppliers.ts` and `src/lib/actions/customers.ts`. Same shape; separate symbols so future divergence (Phase 2 tier on customers, payment terms on suppliers) doesn't drag both along.

```ts
// src/lib/actions/suppliers.ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supplierInputSchema, type SupplierInput } from "@/lib/schemas/partner";

export async function createSupplier(input: SupplierInput): Promise<{ id: string; name: string }> {
  const parsed = supplierInputSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("suppliers").insert({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
    created_by: user?.id ?? null,
  }).select("id, name").single();
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
  return data;
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<void> {
  const parsed = supplierInputSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update({
    name: parsed.name,
    country: parsed.country,
    contact_person: parsed.contactPerson,
    email: parsed.email,
    phone: parsed.phone,
    tax_id: parsed.taxId,
    address: parsed.address,
    notes: parsed.notes,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
}

export async function archiveSupplier(id: string, archived: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").update({ is_archived: archived }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/suppliers");
}
```

`customers.ts` is the same code with `supplier`/`suppliers` replaced by `customer`/`customers`.

### `createTransaction` update

In `src/lib/actions/transactions.ts`, the parent-row insert gains two more columns:

```ts
const { data: txRow, error: txErr } = await supabase
  .from("transactions")
  .insert({
    // ...existing fields...
    supplier_id: parsed.type === "PURCHASE" ? parsed.supplierId : null,
    customer_id:
      parsed.type === "SALE" || parsed.type === "RETURN" ? parsed.customerId : null,
  })
  .select("id")
  .single();
```

The existing `counterparty_name` write stays. It's still the operator-typed string; the form is responsible for filling it from the picked partner's `name` (see §6 form behavior).

---

## 6. UI components

### 6.1. CRUD pages

`src/app/(app)/suppliers/`:
- `page.tsx` — server component. Fetches all suppliers (sorted by name), passes to `SupplierTable`. Includes a "New supplier" button at the top that opens `SupplierFormDialog` in create mode.
- `SupplierTable.tsx` — list of rows: `name`, `country`, `contact_person`, `email`, `phone`, status (archived?), and Edit + Archive actions per row. Edit opens `SupplierFormDialog` in edit mode with the row pre-loaded.
- `SupplierFormDialog.tsx` — full 8-field form using `react-hook-form` + `zodResolver(supplierInputSchema)`. Submit calls `createSupplier` or `updateSupplier`. Closes on success; surfaces zod errors per field.

`customers/` is the symmetric mirror.

### 6.2. `InlinePartnerCreateDialog` (shared)

Used inside `SupplierLinePicker` and `CustomerLinePicker`. Two-field form (name + country) for speed. Takes a `mode: "supplier" | "customer"` prop and calls the matching create action.

```tsx
type Props = {
  mode: "supplier" | "customer";
  onCreated: (partner: { id: string; name: string }) => void;
  trigger: React.ReactNode;
};
```

After save, the new partner is auto-selected in the parent picker (via `onCreated`).

### 6.3. Pickers — `SupplierLinePicker` and `CustomerLinePicker`

Layout matches the post-fix `SkuLinePicker` from Plan 2.5: a Select inside a flex container, with a `+` button immediately to its right (NOT inside the dropdown, to avoid Select stealing keyboard input from the create dialog).

```tsx
type Props = {
  value: string | null;
  onChange: (id: string | null, name: string) => void;
  initialPartners: Partner[];  // pre-loaded by the /new page
};
```

The `onChange` callback passes BOTH the id and the name. The form uses the name to update its `counterpartyName` field automatically, so the historical-name-survives-rename invariant holds.

### 6.4. Transaction-form changes

**`PurchaseFields.tsx`:**
- Replace the existing free-text "Supplier" `<Input>` with `<SupplierLinePicker>`.
- Internal state changes from `const [counterparty, setCounterparty] = useState("")` to:
  ```tsx
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [counterpartyName, setCounterpartyName] = useState("");
  ```
- The picker's `onChange(id, name)` callback updates both pieces of state.
- Form data sent to parent includes both `supplierId` and `counterpartyName`.
- **No free-text fallback in v1**: if the operator wants a one-off counterparty without a permanent record, the inline-create dialog is the path (name + country, save in two seconds). Adding a separate "type free text" affordance was deliberately deferred to keep the form clean.

**`SaleFields.tsx`:** symmetric. `CustomerLinePicker`, `customerId`, `counterpartyName`.

**`ReturnFields.tsx`:**
- When `linkedSaleId` is set: load the sale's `customer_id` and `counterparty_name`. Set the picker value to the customer id (or null if the sale didn't link a customer) and **lock** the picker (disabled prop), with a tooltip explaining "Locked — return inherits customer from linked sale." If the sale had only free-text counterparty, show that text in a read-only fallback display.
- When unlinked: picker editable.

**TRANSFER, ADJUSTMENT, FX_CONVERSION:** no change. These have no counterparty concept.

### 6.5. `/new` page — fetch partners alongside SKUs

The page already does parallel fetches for SKUs / warehouses / cash accounts. Add two more:

```ts
supabase.from("suppliers").select("id, name, country").eq("is_archived", false).order("name"),
supabase.from("customers").select("id, name, country").eq("is_archived", false).order("name"),
```

Pass into `NewTransactionForm`, which passes the appropriate list into each per-type field component.

### 6.6. Sidebar — `AppSidebar.tsx`

Insert two new entries after "Cash accounts" and before "Sign out":

```tsx
{ href: "/suppliers", label: "Suppliers" },
{ href: "/customers", label: "Customers" },
```

### 6.7. Transaction detail page — `/transactions/[id]/page.tsx`

The header currently shows `tx.counterparty_name`. After this plan:
- If `tx.supplier_id` is set: fetch the supplier and display `<name>` followed by `(Supplier)` label.
- Else if `tx.customer_id` is set: same with the customer.
- Else: fall back to `tx.counterparty_name` plain string.

No clickable links from the partner name in v1 (no partner detail pages). The CRUD pages are the only entry point to view a partner.

---

## 7. File structure additions

```
src/
  app/(app)/
    suppliers/
      page.tsx
      SupplierTable.tsx
      SupplierFormDialog.tsx
    customers/
      page.tsx
      CustomerTable.tsx
      CustomerFormDialog.tsx
  components/forms/
    SupplierLinePicker.tsx
    CustomerLinePicker.tsx
    InlinePartnerCreateDialog.tsx
  lib/
    schemas/partner.ts
    actions/suppliers.ts
    actions/customers.ts
supabase/migrations/
  0005_add_partners.sql
```

Modified:
- `src/lib/schemas/transaction.ts` — add `supplierId` / `customerId` to PURCHASE / SALE / RETURN.
- `src/lib/actions/transactions.ts` — write the new columns in the parent insert.
- `src/components/forms/PurchaseFields.tsx` — picker.
- `src/components/forms/SaleFields.tsx` — picker.
- `src/components/forms/ReturnFields.tsx` — picker with lock.
- `src/app/(app)/new/page.tsx` — fetch partners.
- `src/app/(app)/transactions/[id]/page.tsx` — display linked partner name.
- `src/components/AppSidebar.tsx` — two new entries.

---

## 8. Validation rules

| Rule | Where |
|---|---|
| `name` non-empty on supplier / customer | zod `min(1)` |
| All optional fields default to empty string (not null) | DB default + zod default |
| Partner cannot be deleted (only archived) | UI; no DELETE endpoint |
| FK column nullable | DB schema |
| `counterparty_name` always set even if FK is set | Form invariant — picker's onChange writes both |
| RETURN customer locked when linked to sale | Form behavior (`disabled` prop) |

---

## 9. Acceptance criteria

Plan 2.6 is complete when:

1. `suppliers` + `customers` tables exist with the 11 columns above; RLS policies enabled.
2. `transactions.supplier_id` and `customer_id` columns exist (nullable); partial indexes present.
3. `/suppliers` page works end-to-end: create with name only succeeds; create with all 8 fields succeeds; edit succeeds; archive + unarchive toggle works.
4. `/customers` page works end-to-end: same shape as suppliers.
5. PURCHASE form: Supplier picker shows existing suppliers, inline-create opens a 2-field dialog, save auto-selects the new supplier, transaction saves with both `supplier_id` and `counterparty_name` set.
6. SALE form: same end-to-end with Customer picker.
7. RETURN form: when linked to a sale that has a `customer_id`, the picker is pre-filled and disabled; when unlinked, the picker is editable.
8. Sidebar has Suppliers and Customers entries.
9. Transaction detail page displays the partner name when the FK is set; falls back to `counterparty_name` when not.
10. Existing pre-2.6 transactions still display correctly (FKs are null, free-text fallback used).
11. `npm test` passes — existing 34 tests still pass; no new tests required (logic is too simple for unit tests; manual verification on production covers the flow).
12. `npm run build` and `npm run lint` are clean.
13. Deployed to `trading-erp-five.vercel.app` and tested end-to-end.

---

## 10. Risks and notes

- **No free-text fallback inside the transaction-form picker.** If an operator wants a counterparty without a record, they use the 2-field inline-create dialog. The free-text `counterparty_name` column still exists on `transactions` for legacy data; new transactions always come through the picker path.
- **Email is not validated as RFC-compliant email** — deliberate. Operators in this trading business often use messenger handles (LINE, WeChat) as primary contact.
- **No partner detail pages in v1.** Acceptable for now; Phase 2's pricing engine + Phase 4's analytics may add them when there's enough to show on the page.
- **Renaming a partner does NOT update past transactions' `counterparty_name`.** Intentional — that string is the historical record of how the operator referred to them at the time. If you want the new name to apply retroactively, archive the old record and create a new one.
- **No merging tool for duplicate records.** Discovered duplicates are reconciled by archiving one and (manually) updating the affected transactions' FK. Real concern for large-scale use; for ≤ ~30 suppliers and ~few hundred customers, the manual fix is fine.
- **Customer records from Phase 3 (shop ingestion)** will write into the same `customers` table. The shop adapter will dedupe by some key (email + name probably) but that's its problem, not 2.6's.
