# Trading ERP — Phase 1, Plan 2 Design (Transactions)

**Date:** 2026-05-13
**Status:** Draft pending user review
**Scope:** Phase 1, Plan 2 of 3. Adds transaction entry, listing, detail, and reversal to the shipped Plan 1 foundation.

> **Note:** Plan 1 (Foundation) shipped 2026-05-13 at https://trading-erp-five.vercel.app. This spec lives in `backpack-customizer/docs/superpowers/specs/` for continuity with the Plan 1 spec; both should eventually move into the `trading-erp` repo.

**Reference docs:**
- Phase 1 spec: `2026-05-12-trading-erp-phase-1-design.md` (the umbrella design — section 4 has the table/movement schema)
- Plan 1 implementation: `2026-05-12-trading-erp-p1-foundation.md`

---

## 1. Purpose

Plan 1 delivered the foundation: auth, schema, SKU + cash-account CRUD. Plan 2 makes the system actually useful by adding the **six transaction types** that move stock and cash, plus the list/detail/reverse flow that lets operators see and correct what they recorded.

Cash and stock balances (already exposed via the `v_cash_balances` and `v_stock_by_sku_warehouse` views from Plan 1) will start showing real numbers as soon as Plan 2 transactions are entered. The Overview dashboard that displays those numbers prettily is Plan 3.

### What Plan 2 builds

| Route | Purpose |
|---|---|
| `/new` | Unified transaction entry form with type selector |
| `/transactions` | Filterable, paginated list |
| `/transactions/[id]` | Read-only detail with reverse action |

### Explicitly out of scope (deferred)

- **Pricing engine** (qty × country × on-sale rules) → Phase 2. Operator types the price for each line.
- **Customer / supplier records** → Phase 2. Counterparty stays free text.
- **Barcode / QR scanning** → Plan 2.5 (after Plan 2 ships). Will add a `gs1_gtin` column on `skus` and a camera-based scanner that swaps the SKU picker for capture.
- **Overview dashboard** → Plan 3. Plan 2 surfaces balances only via the existing per-currency tables on the SKU and cash-account pages.
- **Shop ingestion** → Phase 3.

---

## 2. Confirmed design decisions (from brainstorm)

These are the resolutions of every gap the Plan 1 design left open for Plan 2. They are binding.

### 2.1. Landed cost on PURCHASE — pro-rata allocation (option B)

A PURCHASE has **N line items** (goods) and **M cash legs** (typically: one to the supplier, plus optional legs for shipping and customs). The form accepts these separately so the operator never does math in their head. At submit time the server runs:

```
goods_total      = Σ (line.qty × line.unit_price_minor)
non_goods_total  = Σ (cash_leg.amount_minor where leg is not the goods leg)
cost_factor      = non_goods_total / goods_total
for each line:
  landed_unit_cost_minor = round(line.unit_price_minor × (1 + cost_factor))
```

The resulting `landed_unit_cost_minor` is stored on each `stock_movements.unit_cost_minor`. Rounding residuals (sum of allocations may drift by 1-2 minor units) are absorbed into the first line item — **last-cent-to-first-line convention**.

If `non_goods_total = 0`, `cost_factor = 0` and `unit_cost = unit_price`. If `goods_total = 0` the form refuses to submit.

### 2.2. RETURN linked to original SALE — optional link (option B)

A RETURN may carry a nullable `from_transaction_id` pointing to the originating SALE. When set:

- The form auto-populates customer, currency, and per-line unit_price and warehouse from the sale.
- Each line's **warehouse is locked** to the original sale's warehouse for that line. The "into damaged" toggle still works — toggling routes the stock to that warehouse's paired damaged warehouse (Taiwan → Taiwan-Damaged), never to a different country's damaged warehouse.
- Each line's qty is capped at the qty sold for that line.
- Server action validates these constraints; submission with mismatching warehouse is rejected.

When unset (gift returns, found-on-shelf cases): the operator picks warehouses and types prices freely.

### 2.3. Return shipping — separate cash leg, not capitalized

A RETURN may have **0, 1, or many cash_movements**:

- Refund to customer (typical; can be zero for warranty exchange).
- Return shipping you paid (e.g. paid the courier to retrieve the item).

Each is its own `cash_movement` row tied to the RETURN transaction. **None of these are added to the returned item's stock cost** — the cost basis of the returned item remains its original landed cost from the prior PURCHASE.

### 2.4. Currency rule per transaction type

| Type | All cash legs same currency? | Notes |
|---|---|---|
| PURCHASE, SALE, RETURN | Yes — must match the transaction's currency field | Cash-account picker on each leg is filtered to accounts matching the chosen currency. Cross-currency shipping (e.g. CNY goods + USD shipping) requires either an `FX_CONVERSION` first, or splitting into two transactions. |
| TRANSFER | N/A — stock has no native currency | The optional shipping cash leg picks any cash account; its currency is whatever the account is. |
| ADJUSTMENT | Single leg follows its account's currency | No transaction-level currency lock. |
| FX_CONVERSION | No — **must be two different currencies** | The whole point. Server action rejects same-currency submissions. |

### 2.5. Inline SKU creation in transaction form

In every line item's SKU picker, the dropdown ends with a `+ new SKU` action. Clicking opens a sub-dialog with two options:

- Type a code yourself, name, description.
- **"Generate custom SKU"** button — calls the existing `generateNextCustomSkuCode()` from `lib/sku.ts` (shipped in Plan 1) to fill in `CUST-YYYY-NNNN`.

On submit, the existing `createSku` server action runs, the new SKU is selected on the current line, and the operator stays in the transaction form. No context switch to `/skus`.

### 2.6. Reverse vs Return — separate concepts

- **Reverse** (`reverses_transaction_id`): "this transaction was entered in error; undo it." Creates a mirror with sign-flipped movements.
- **Return** (`from_transaction_id`): "the customer actually brought goods back." A new business event.

Reversing a SALE does **not** create a RETURN. Reversing a RETURN does **not** undo the original sale (it cancels the return event only). Both flows are independent; both supported by separate columns and separate UI banners.

---

## 3. Schema change

One migration: `supabase/migrations/0003_add_from_transaction_id.sql`

```sql
alter table transactions
  add column from_transaction_id uuid references transactions(id);

create index idx_transactions_from on transactions (from_transaction_id)
  where from_transaction_id is not null;
```

Applied via `supabase db push`. After application, regenerate types: `npm run db:types`.

No other schema changes. Plan 1's schema (`transactions`, `stock_movements`, `cash_movements`, including `reverses_transaction_id`) handles everything else.

---

## 4. Transaction type semantics

The full semantic table for each of the 6 types. `N` means "0 or more", `1+` means "at least one required to submit".

| Type | Stock movements | Cash movements | Other constraints |
|---|---|---|---|
| **PURCHASE** | 1+ `(+qty)` into live warehouses | 1+ `(−)`; one designated as the "goods" leg, rest are cost legs; landed cost computed | All same currency; goods_total > 0 |
| **SALE** | 1+ `(−qty)` from live warehouses | 1+ `(+)`; typically one customer payment | All same currency; qty cannot exceed current stock (warn, not block) |
| **RETURN** | 1+ `(+qty)` into a live or paired-damaged warehouse | 0+ `(−)`; refund and/or return-shipping legs | Same currency; if linked to sale: warehouse locked to sale's warehouse, qty ≤ sold qty |
| **TRANSFER** | Exactly 2 movements (− from source, + into destination) per SKU line | 0 or 1 `(−)` shipping leg (any currency) | Source ≠ destination; line items 1+ |
| **ADJUSTMENT** | 0 or 1 (signed integer `qty_delta`, free) | 0 or 1 (signed `amount_minor_delta`) | Exactly one side populated (xor); mandatory `notes` |
| **FX_CONVERSION** | 0 | Exactly 2: one `(−)` source-currency leg, one `(+)` destination-currency leg | Two cash accounts must be different currencies; both amounts > 0 |

---

## 5. Form UX

All six types share `/new` with a top tab selector. Below the selector, shared fields (`occurred_at`, `notes`) then type-specific fields, then a single `Save` button.

### 5.1. PURCHASE

```
[ Date ] [ Supplier name ] [ Currency ]                [ Notes ]

Line items                                              + Add line
┌ SKU              Warehouse    Qty    Unit price    Line total ┐
│ TEST-001 ▾       China ▾      10     ¥80.00        ¥800.00 ✕ │
│ + new SKU…                                                    │
└───────────────────────────────────────────────────────────────┘

Cash legs                       + Add cost (shipping/customs)
┌ Description     Cash account         Amount               ┐
│ Goods           BOC RMB chequing ▾   ¥1,400               │
│ DHL shipping    BOC RMB chequing ▾   ¥80               ✕ │
└──────────────────────────────────────────────────────────-┘

Landed cost preview (live):
  TEST-001:  ¥84.57/unit  (¥80 goods + ¥4.57 allocated)

Totals:  Cash out ¥1,480     Goods ¥1,400     Allocation ¥80

[ Save ]
```

The "Goods" cash leg is required and not removable. Cost legs (shipping/customs) are optional and removable. Cash-account dropdown filtered to the transaction's currency.

### 5.2. SALE

Same shape as PURCHASE but:
- Direction reversed (line stock decreases, cash account receives money).
- No landed-cost math; `unit_cost_minor` on stock_movements is the unit price as typed (this represents revenue cost basis, which equals the price the customer paid).
- Single cash leg by default (customer payment). Add more if needed (rare).
- Counterparty field labeled "Customer".

### 5.3. RETURN

```
[ Date ]  [ Link to original sale: search ▾ (optional) ]  [ Currency ]

Customer:  (auto-filled if linked, else free text)

Line items                                              + Add line
┌ SKU            Warehouse        Qty   Unit price   Damaged? ┐
│ TEST-001 ▾     Taiwan 🔒        2     ¥350.00      [ ] ✕   │
└────────────────────────────────────────────────────────────-┘
(🔒 = locked because linked to sale)

Cash legs                       + Add cash leg
┌ Description       Cash account       Amount               ┐
│ Refund            FNB SZL ▾          (−SZL 700)           │
│ Return shipping   FNB SZL ▾          (−SZL 50)         ✕ │
└──────────────────────────────────────────────────────────-┘
```

Refund leg present by default but can be zeroed for warranty exchanges. "Into damaged" toggle per line routes that line's stock_movement to the paired damaged warehouse.

### 5.4. TRANSFER

```
[ Date ]                                                [ Notes ]
[ Source warehouse ▾ ]  →  [ Destination warehouse ▾ ]

Line items                                              + Add line
┌ SKU              Qty                                       ┐
│ TEST-001 ▾       3                                      ✕ │
└────────────────────────────────────────────────────────────┘

Optional cash leg                  + Add shipping cost
(none by default)
```

Default destination is the next live warehouse in pair order; operator can override.

### 5.5. ADJUSTMENT

```
[ Date ]  [ Mode: ( ) Stock  ( ) Cash ]                 [ Reason — required ]

If Stock mode:
  SKU ▾   Warehouse ▾   Qty delta (signed integer)
If Cash mode:
  Cash account ▾   Amount delta (signed minor units)
```

Mandatory notes/reason field — submission rejected if empty.

### 5.6. FX_CONVERSION

```
[ Date ]                                                [ Notes ]

From:  [ Cash account ▾ (e.g. FNB SZL) ]  Amount:  [ -SZL 8,500 ]
To:    [ Cash account ▾ (e.g. Taiwan bank NTD) ]  Amount:  [ +NT$13,940 ]

Implied rate (live): 1 SZL → 1.640 NTD       (1 NTD → 0.610 SZL)
```

Server rejects same-currency. Both amounts must be > 0 (typed as positives; the negative sign on the source leg is implicit).

### 5.7. Submit behavior

For every type, `Save` calls the single `createTransaction` server action. Server validates, builds rows, and inserts the transaction + all its movements **in one DB transaction**. On success, redirect to the new transaction's detail page (`/transactions/<id>`). Errors stay on form with a top-level error banner; no partial save is possible.

---

## 6. List page (`/transactions`)

TanStack Table. Columns:

| Date | Type | Counterparty | Currency | Total cash effect | Recorded by |

- Default sort `occurred_at desc`.
- Filters above the table: Type (multi-select), Date range, Currency (multi-select), Counterparty (text contains), Warehouse (multi-select; matches if any line touches that warehouse).
- Server-side pagination, page size 50, `(occurred_at desc)` indexed.
- Row click → `/transactions/[id]`.

---

## 7. Detail page (`/transactions/[id]`)

Read-only. Sections in order:

1. **Header**: type, occurred_at, counterparty, currency, total cash effect (sum of `amount_minor_delta` across cash_movements, displayed as a signed value in the transaction's currency), recorded by, created_at. No "total stock" line — summing qty across different SKUs is meaningless; the stock_movements table below speaks for itself.
2. **Stock movements** table: SKU, warehouse (with "(damaged)" suffix if `is_damaged`), qty_delta, unit_cost_minor.
3. **Cash movements** table: cash_account (with currency suffix), amount_minor_delta.
4. **Cross-reference banners** (only when applicable):
   - Reverses #ABC → "This transaction reverses #ABC. [Open original]"
   - Reversed by #XYZ → "Reversed by #XYZ. [Open reversal]"
   - From sale #DEF (RETURN) → "Return for sale #DEF. [Open sale]"
   - Has returns → "Has returns: [#GHI] [#JKL]" (list of all RETURNs whose `from_transaction_id` = this)
5. **Reverse button**: visible if not already reversed; opens a confirmation dialog with an optional reason field.

### Reverse dialog and action

On confirm, the `reverseTransaction(originalId, reason?)` server action:

1. Loads original transaction + all its stock_movements + cash_movements.
2. Inserts a new transaction row with `type` = original type, `occurred_at` = `now()`, `currency_code` = original currency, `counterparty_name` = original, `notes` = "Reversal: " + reason, `reverses_transaction_id` = originalId, `from_transaction_id` = null.
3. Inserts mirror stock_movements: same sku_id and warehouse_id, sign-flipped qty_delta, same unit_cost_minor.
4. Inserts mirror cash_movements: same cash_account_id, sign-flipped amount_minor_delta.
5. All in one DB transaction.
6. Returns the new transaction id; UI navigates to it.

Reversing a reversal is allowed (it cancels the reversal and restores the original effect) but the UX warns ("This will re-apply the original. Continue?").

---

## 8. Validation rules summary

Implemented in zod schemas (client + server) plus server-action runtime checks for the rules zod can't express.

| Rule | Where |
|---|---|
| Currency on every line item / cash leg matches the transaction currency (for PURCHASE/SALE/RETURN) | zod refine |
| At least one line item exists (PURCHASE/SALE/RETURN/TRANSFER) | zod min(1) |
| ADJUSTMENT has exactly one of stock OR cash side | zod refine (xor) |
| ADJUSTMENT reason is non-empty | zod min(1) |
| FX_CONVERSION has exactly 2 cash legs in different currencies, both amounts > 0 | zod refine |
| RETURN line warehouse matches linked sale's warehouse (or its damaged pair) | server-action check (needs DB lookup) |
| RETURN line qty ≤ linked sale's line qty | server-action check |
| TRANSFER source ≠ destination | zod refine |
| Negative qty / negative price on line items | zod (z.number().nonnegative()) |
| PURCHASE goods_total > 0 | server-action check |

---

## 9. File structure additions

```
src/
  app/(app)/
    new/page.tsx
    transactions/page.tsx
    transactions/[id]/page.tsx
    transactions/[id]/ReverseDialog.tsx
  components/forms/
    NewTransactionForm.tsx              # top-level: type selector + branches
    PurchaseFields.tsx
    SaleFields.tsx
    ReturnFields.tsx
    TransferFields.tsx
    AdjustmentFields.tsx
    FxConversionFields.tsx
    SkuLinePicker.tsx                   # picker with "+ new SKU" inline-create
    InlineSkuCreateDialog.tsx
    CashLegRows.tsx                     # shared editable cash-leg list
  lib/
    schemas/
      transaction.ts                    # discriminated union over the 6 types
    actions/
      transactions.ts                   # createTransaction (all 6 types)
      transactions.reverse.ts           # reverseTransaction
    landedCost.ts                       # pro-rata pure function (TDD)
    transactionMath.ts                  # totals, FX rate derivation, sign-flip (TDD)
supabase/migrations/
  0003_add_from_transaction_id.sql
```

---

## 10. Server actions

Two new functions; both wrap all writes in a single DB transaction.

### `createTransaction(input: TransactionInput): Promise<{ id: string }>`

- `TransactionInput` is a zod discriminated union over the 6 types.
- Validates with `transactionInputSchema.parse(input)`.
- For PURCHASE: runs `computeLandedCosts(input.lines, input.cashLegs)` to produce per-line `unit_cost_minor`.
- For RETURN with `from_transaction_id`: queries the original sale's stock_movements to validate warehouse and qty per line.
- For all types: builds the row sets, calls `supabase.rpc('create_transaction_atomic', {...})` OR sequences inserts inside a server action with explicit error handling and (if any insert fails) deletes the parent row to roll back. **Decision deferred to implementation** — Plan 2's plan document will pick one based on practical Supabase JS client behavior. The acceptance criterion is "either everything saves or nothing does."
- Returns the new transaction id.

### `reverseTransaction(originalId: string, reason?: string): Promise<{ id: string }>`

- Loads original + movements.
- Builds sign-flipped mirror.
- Inserts atomically.
- Returns new id.

---

## 11. zod schema shape

```ts
// Simplified shape; actual schemas use full validation.
const purchaseSchema = z.object({
  type: z.literal("PURCHASE"),
  occurredAt: z.coerce.date(),
  counterpartyName: z.string().trim().default(""),
  currencyCode: currencyCodeSchema,
  notes: z.string().default(""),
  lines: z.array(purchaseLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
}).refine(/* currency consistency */);

const saleSchema = z.object({ /* same shape, type=SALE */ });
const returnSchema = z.object({
  type: z.literal("RETURN"),
  /* ... */
  fromTransactionId: z.string().uuid().nullable(),
  lines: z.array(returnLineSchema).min(1), // returnLineSchema has intoDamaged
  cashLegs: z.array(cashLegSchema).min(0), // zero or more
});
const transferSchema = z.object({ /* ... */ });
const adjustmentSchema = z.object({ /* with xor refine */ });
const fxConversionSchema = z.object({ /* two-leg, different currency refine */ });

export const transactionInputSchema = z.discriminatedUnion("type", [
  purchaseSchema, saleSchema, returnSchema, transferSchema, adjustmentSchema, fxConversionSchema,
]);
export type TransactionInput = z.infer<typeof transactionInputSchema>;
```

---

## 12. Pure-logic unit tests (TDD)

| Module | What's tested |
|---|---|
| `landedCost.ts` | Zero shipping → unit_cost = unit_price. Single line + shipping → all allocation on that line. Multi-line + shipping → pro-rata by goods value. Rounding residual goes to first line (sum of unit_cost * qty equals total cash out). Zero goods total → throws. |
| `transactionMath.ts` | Total cash effect. Total stock effect. FX rate derivation from two cash_movements. Mirror computation for reversal (sign-flip preserves zero, handles bigint). |

Server-action logic (DB-touching) is verified manually on production after deploy.

---

## 13. Acceptance criteria

Plan 2 is complete when:

1. All 6 transaction types can be submitted via `/new`. Each submit is atomic — partial saves impossible.
2. Inline SKU creation works inside the line picker, with both "type a code" and "Generate custom SKU" paths.
3. PURCHASE landed cost: form preview matches the saved `stock_movements.unit_cost_minor` (verified by inspecting a real saved row).
4. RETURN linked to a sale: warehouse is locked, qty is capped, prices/customer auto-populate.
5. FX_CONVERSION rejects same-currency input.
6. `/transactions` list shows all created transactions, filters work, pagination works.
7. `/transactions/[id]` displays movements and shows the right cross-reference banners when applicable.
8. "Reverse this transaction" creates a mirror; banners link both ways on both detail pages.
9. `npm test` passes (existing Plan 1 tests + new landed-cost + transactionMath tests).
10. `npm run build` and `npm run lint` are clean.
11. Deployed at `trading-erp-five.vercel.app`; all six types tested end-to-end by the operator in production.

---

## 14. Risks and open implementation choices

- **DB-transactional inserts via Supabase JS client.** Supabase JS doesn't natively expose `BEGIN ... COMMIT` for client-side use. Two options: (a) a stored procedure (`create_transaction_atomic`) called via `supabase.rpc()`, or (b) sequenced inserts inside the Server Action with rollback-on-failure logic (delete parent row if any child fails). Choice deferred to the Plan 2 implementation plan. Both meet the acceptance criterion; option (a) is cleaner, option (b) is faster to write.
- **Rounding residual policy.** "Last cent to first line" is a deliberate choice. Alternative: distribute residual proportionally. The chosen policy is documented in `landedCost.ts` comments and is the basis for the unit tests.
- **Pagination performance** at ~100 SKUs × ~10 tx/day × 10 years ≈ 37k transactions. The `(occurred_at desc)` index makes this trivial, but the filter combinations may need a few more indexes once we see real query patterns. Plan 3 (Overview) is where we'll likely add `(currency_code, occurred_at)` and similar; not necessary for Plan 2.
- **Operator self-error on PURCHASE landed cost**: if shipping is paid in a different currency, today the operator must FX-convert first. A future iteration may relax this to allow mixed currencies via per-leg FX conversion at the moment of save. Out of scope for Plan 2.
- **RETURN linked to a SALE that was later reversed**: a linked RETURN whose original sale gets reversed becomes semantically orphaned. We accept this for Plan 2 — the cross-reference banners still link, and the data remains consistent. No special handling.
