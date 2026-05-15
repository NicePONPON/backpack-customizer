# Trading ERP — Phase 1, Plan 2.7 Design (Printable Documents + Tax)

**Date:** 2026-05-15
**Status:** Draft pending user review
**Scope:** Phase 1, Plan 2.7. Adds bilingual (English + 繁體中文) printable documents — one per transaction type — plus a tax-rate column on transactions and per-currency defaults. Browser-native print → save as PDF.

> **Note:** Plans 1, 2, 2.5, 2.6 shipped 2026-05-13/14. Live at https://trading-erp-five.vercel.app. This spec lives in `backpack-customizer/docs/superpowers/specs/` for continuity with prior plans; should eventually move into the `trading-erp` repo.

**Reference docs:**
- Phase 1 umbrella spec: `2026-05-12-trading-erp-phase-1-design.md`
- Plan 2 spec: `2026-05-13-trading-erp-phase-1-plan-2-transactions-design.md`
- Plan 2.5 spec: `2026-05-14-trading-erp-phase-1-plan-2.5-barcode-scan-design.md`
- Plan 2.6 spec: `2026-05-14-trading-erp-phase-1-plan-2.6-suppliers-customers-design.md`

---

## 1. Purpose

Transactions live in the database but the operator needs **paper or PDF documents** to send to suppliers/customers and to keep for audit. Plan 2.7 produces one formatted document per transaction type — bilingual (EN + 繁體中文), branded with the Anpeng logo, and printable via the browser's native Print dialog (which lets the operator save as PDF or print on paper).

Adds tax handling as a side benefit: a single `tax_rate_basis_points` column on `transactions`, with per-currency default suggestions, and tax-inclusive math that produces the Subtotal / Tax / Total breakdown on documents. Phase 2 will handle the more sophisticated per-product / per-SKU tax rules when they arrive.

### What Plan 2.7 builds

1. New column `transactions.tax_rate_basis_points` (integer, default 0).
2. Per-currency tax-rate defaults as constants (`src/lib/taxRates.ts`), suggested in the form but operator can override per transaction.
3. A "Tax rate %" input added to PURCHASE / SALE / RETURN forms (other types: tax not applicable).
4. New env vars for company info (name, address, tax ID, phone, email — each with EN and ZH variants where appropriate).
5. New constants module `src/lib/companyInfo.ts` reading from those env vars.
6. New routes: `/transactions/[id]/print?lang=both|en|zh`.
7. Six printable document templates (one per transaction type) sharing a common header/footer.
8. A bilingual mechanic: every label has EN + ZH; a CSS class on the page root toggles which language(s) display.
9. Print CSS: A4 page, 20mm margin, hide sidebar, force black on white.
10. New control on the transaction detail page: a language `<select>` + "📄 Print document" button that opens the print view in a new tab.

### Out of scope (deferred)

- **Per-product (per-SKU) tax rates** → Phase 2 pricing engine.
- **Per-line tax rate** (whole-transaction rate only in v1).
- **Server-side PDF generation** (no `puppeteer` / `react-pdf` / Chromium). Operator triggers `window.print()` themselves.
- **Email-to-counterparty**.
- **Sequential `PO-2026-0001` document numbers** — we use UUID prefix `PO-<uuid8>` for v1.
- **Editable per-currency tax defaults via UI** — defaults live in code; redeploy if you need to change them.
- **Signature image embedding** — just printed `_________` lines for hand-signing.
- **Multi-page documents with > ~25 line items per page** — for typical 1–10 line items per transaction, the document fits on one A4 page. Many-line cases may overflow; if it bites, paginate later.

---

## 2. Confirmed design decisions

These are the resolutions of the Plan 2.7 brainstorm and are binding.

### 2.1. Six document types, one per transaction type

| Tx type | Document title (EN / 中) | Audience |
|---|---|---|
| PURCHASE | Purchase Order / 採購單 | Send to supplier |
| SALE | Invoice / 發票 (combined invoice + delivery for v1) | Send with goods to customer |
| RETURN | Credit Note / 退貨單 | Customer's refund record |
| TRANSFER | Transfer Note / 調撥單 | Internal warehouse paperwork |
| ADJUSTMENT | Adjustment Memo / 調整備忘錄 | Internal audit trail |
| FX_CONVERSION | FX Conversion Memo / 換匯備忘錄 | Internal bank conversion record |

All documents share the same header (logo + company info) and footer (signatures + UUID for traceability). The middle (counterparty section, line items table, tax breakdown) varies by type — see §6.

### 2.2. Bilingual EN + 繁體中文, with a per-print toggle

Templates **always** include both languages at the JSX level. The page sets a class on the root (`lang-en`, `lang-zh`, or `lang-both`) based on the `?lang=...` query param. CSS hides the unwanted language(s):

```css
.lang-en .zh-only,
.lang-en .bilingual-only,
.lang-zh .en-only,
.lang-zh .bilingual-only {
  display: none;
}
```

Default is `lang=both`. The operator picks via a small `<select>` on the transaction detail page before clicking Print.

### 2.3. Tax-inclusive math with per-currency defaults

Operator-entered amounts are **tax-inclusive** (this is how trading prices are quoted in practice). The document derives the breakdown:

```
subtotal_minor = round(total_minor × 10000 / (10000 + tax_rate_basis_points))
tax_minor      = total_minor − subtotal_minor
```

Per-currency defaults (suggestions; operator can override per transaction):

| Currency | Default rate | Note |
|---|---|---|
| NTD | 5% | Taiwan business tax (營業稅) |
| CNY | 1% | China small-scale-taxpayer rate; general taxpayers are 13% on goods — override per transaction if dealing with a general-rate supplier |
| SZL | 15% | Eswatini VAT standard rate (verified 2026) |
| ZAR | 15% | South Africa VAT standard rate (verified 2026 — the proposed 15.5% / 16% increases were reversed in April 2025) |
| USD | 0% | Default for export / unspecified; override per transaction if subject to a US state sales tax |

Rates are stored on each transaction at save time → **frozen for audit**. Reprinting an old PO years later always shows the rate that was in force at the time. National rate changes only affect new transactions.

### 2.4. Browser-native PDF (no server-side rendering)

The print view is a plain Next.js server-component page styled with `@media print` CSS. Operator hits Cmd/Ctrl+P → Save as PDF. No `puppeteer` / `react-pdf` / Chromium dependency. Zero server load for document generation.

### 2.5. UUID-prefix document numbers

Document number = `<DOC_PREFIX>-<first 8 chars of transaction UUID>`. Prefixes per type:
- PO = Purchase Order
- INV = Invoice
- CN = Credit Note
- TRF = Transfer Note
- ADJ = Adjustment Memo
- FX = FX Memo

Example: `PO-2a96786a`. Trivially unique because UUIDs are unique. We avoid the complexity of a monotonic counter (which would need atomic sequence-grabbing, conflict handling, etc.). If you ever want pretty `PO-2026-0001` numbers, it's a focused future plan.

### 2.6. Logo + company info from env vars

The logo lives at `public/Anpeng-logo.png` (already committed). Company info comes from environment variables — read by the server component via `getCompanyInfo()` in `src/lib/companyInfo.ts`. Stored in `.env.local` for dev + Vercel for prod.

---

## 3. Schema migration

Single file: `supabase/migrations/0006_add_tax_rate_to_transactions.sql`

```sql
alter table transactions
  add column tax_rate_basis_points integer not null default 0;
```

- **Integer basis points**: 500 = 5%, 1700 = 17%, 100 = 1%. Avoids float-precision issues at scale.
- **Default 0**: pre-2.7 transactions print with no tax breakdown (just a Total line).
- **`not null`**: every transaction is tax-aware, even if zero.

After apply: regenerate `database.types.ts` (or manually patch if PAT is revoked, same pattern as prior plans).

No other schema changes.

---

## 4. Env vars

Add to `.env.local` (dev) and Vercel (prod):

```
MY_COMPANY_NAME_EN=ANPENG International Trading Co., Ltd.
MY_COMPANY_NAME_ZH=安彭國際貿易有限公司
MY_COMPANY_ADDRESS_EN=6F, No. 148, Sec. 4, Zhongxiao E. Rd., Da'an Dist., Taipei City, Taiwan
MY_COMPANY_ADDRESS_ZH=台北市大安區忠孝東路四段148號6樓
MY_COMPANY_TAX_ID=60481132
MY_COMPANY_PHONE=0933857545
MY_COMPANY_EMAIL=anpeng.trading@gmail.com
```

Update `.env.local.example` with placeholder/blank values for the same keys (committed to git for documentation).

### `src/lib/companyInfo.ts`

```ts
export function getCompanyInfo() {
  return {
    nameEn: process.env.MY_COMPANY_NAME_EN ?? "Your Company",
    nameZh: process.env.MY_COMPANY_NAME_ZH ?? "",
    addressEn: process.env.MY_COMPANY_ADDRESS_EN ?? "",
    addressZh: process.env.MY_COMPANY_ADDRESS_ZH ?? "",
    taxId: process.env.MY_COMPANY_TAX_ID ?? "",
    phone: process.env.MY_COMPANY_PHONE ?? "",
    email: process.env.MY_COMPANY_EMAIL ?? "",
    logoUrl: "/Anpeng-logo.png",
  };
}
```

Server components import directly; no prop drilling needed.

---

## 5. Tax handling — math, schema, form

### 5.1. The `splitTax` helper (TDD)

Add to existing `src/lib/transactionMath.ts`:

```ts
export function splitTax(totalMinor: bigint, basisPoints: number): { subtotal: bigint; tax: bigint } {
  if (basisPoints <= 0) return { subtotal: totalMinor, tax: 0n };
  const subtotal = (totalMinor * 10000n) / (10000n + BigInt(basisPoints));
  const tax = totalMinor - subtotal;
  return { subtotal, tax };
}
```

Tests cover: zero rate, 5%, 17%, exact divisibility, residual goes to tax (not subtotal — keeps subtotal a clean "what the goods were"), zero amount input.

### 5.2. Per-currency defaults

New constants file `src/lib/taxRates.ts`:

```ts
import type { CurrencyCode } from "./money";

export const DEFAULT_TAX_BASIS_POINTS: Record<CurrencyCode, number> = {
  NTD: 500,   // Taiwan 5% business tax
  CNY: 100,   // China small-scale-taxpayer 1%; general taxpayers are 13% — operator overrides per transaction
  SZL: 1500,  // Eswatini 15% VAT
  ZAR: 1500,  // South Africa 15% VAT
  USD: 0,     // Default for export / unspecified
};

export function formatTaxRate(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`;
}
```

### 5.3. Form changes

`PurchaseFields.tsx`, `SaleFields.tsx`, `ReturnFields.tsx` each get a **"Tax rate %"** number input directly below the Currency Select:

```tsx
<div>
  <Label>Tax rate %</Label>
  <Input
    type="number"
    min={0}
    max={100}
    step={0.01}
    value={taxRatePercent}
    onChange={(e) => setTaxRatePercent(e.target.value)}
  />
</div>
```

When the operator picks a currency, `taxRatePercent` auto-fills with the per-currency default (e.g. NTD → "5"). Operator can override (e.g. "0" for export-exempt, "8.5" for some specific category). On submit, multiply by 100 and round to int to get basis points.

### 5.4. zod schema additions

In `src/lib/schemas/transaction.ts`, add to PURCHASE, SALE, RETURN:

```ts
taxRateBasisPoints: z.coerce.number().int().min(0).max(10000).default(0),
```

`max(10000)` = 100%. TRANSFER, ADJUSTMENT, FX_CONVERSION schemas: unchanged.

### 5.5. Server action update

In `createTransaction`, the parent `transactions` insert gains:

```ts
tax_rate_basis_points:
  parsed.type === "PURCHASE" || parsed.type === "SALE" || parsed.type === "RETURN"
    ? parsed.taxRateBasisPoints
    : 0,
```

---

## 6. Document templates

Single route `/transactions/[id]/print?lang=both|en|zh` (server component) renders the appropriate document based on `tx.type`. Layout uses these shared blocks:

### 6.1. Shared `DocumentLayout` component

Renders the page chrome:
- **Top:** Anpeng logo (max-height 50px) + company name EN/ZH stacked + address EN/ZH stacked + Tax ID · Phone · Email.
- **Below top:** Document title (e.g. "Purchase Order / 採購單"), document number (`PO-2a96786a`), date.
- **Slot:** children — type-specific body.
- **Bottom:** Notes (free text from `tx.notes`) · Signature lines · UUID footer in tiny text.

### 6.2. Per-type bodies

Each transaction type has its own `<XBody />` component that renders just the middle of the page:

- **`PurchaseOrderBody`**: Supplier section (from `tx.supplier_id` linked supplier, else `tx.counterparty_name`), Line items table (SKU / Name / Qty / Unit Price / Total), tax breakdown if `tax_rate_basis_points > 0`.
- **`InvoiceBody`**: Customer section, Line items table, tax breakdown. Header notes "Invoice + Delivery Order" (combined v1).
- **`CreditNoteBody`**: Customer section + "Refund for sale #ABC" reference (if `from_transaction_id` is set), Line items table (positive qty, refund prices), tax breakdown if applicable.
- **`TransferNoteBody`**: "From: <source warehouse> · To: <destination warehouse>", Line items table (SKU / Name / Qty), no prices, no tax.
- **`AdjustmentMemoBody`**: Internal header (not a counterparty document), shows the single stock or cash adjustment with reason. No tax.
- **`FxMemoBody`**: "From: <source account> @<source currency> · To: <destination account> @<destination currency>", with the derived rate. No tax.

### 6.3. Line items table layout

For all types except TRANSFER (which omits price) and ADJUSTMENT/FX (which use different layouts):

```
┌───────────────────────────────────────────────────────────┐
│ SKU       Name           Qty   Unit Price (incl. tax)  Total │
│           品名            數量  單價              小計    │
├───────────────────────────────────────────────────────────┤
│ TEST-001  Cotton tee     10    NT$ 105.00     NT$ 1,050.00 │
│ CUST-…    Custom item    5     NT$  84.57     NT$   422.85 │
└───────────────────────────────────────────────────────────┘
                                Subtotal 小計:  NT$ 1,400.81
                                Tax 稅金 (5%):  NT$    70.04
                                ──────────────────────────────
                                Total 總計:     NT$ 1,470.85
```

`Total = qty × unit_price` (tax-inclusive). Subtotal and Tax derived via `splitTax(total_total, tax_rate_basis_points)`.

### 6.4. Counterparty header

When the transaction has a linked partner (`supplier_id` or `customer_id` set), render the full partner record:
```
Supplier / 供應商:  Acme Supplier
                    China  ·  contact@acme.cn
                    12 Acme Ave, Shenzhen, CN
                    Tax ID: 1234567
```
Each line is conditional: skip the row if the field is empty.

When no partner is linked, fall back to `tx.counterparty_name` as a single line.

### 6.5. Signature lines

Per document type:

| Doc type | Signature lines |
|---|---|
| PO | Authorized by / 授權人 · Received by / 接收人 |
| Invoice | Issued by / 開立人 · Received by / 接收人 |
| Credit Note | Issued by / 開立人 · Received by / 接收人 |
| Transfer Note | Despatched by / 發貨人 · Received by / 接收人 |
| Adjustment Memo | Authorized by / 授權人 |
| FX Memo | Authorized by / 授權人 |

### 6.6. UUID footer

Tiny grey text at the bottom of every page: `Transaction ID: <full uuid>` — so an auditor can look up the exact transaction record from a paper copy.

---

## 7. UI changes outside the print view

### 7.1. Transaction detail page controls

`src/app/(app)/transactions/[id]/page.tsx`: existing "Reverse this transaction" button stays. Add to its right:

```tsx
<select value={lang} onChange={(e) => setLang(e.target.value)}>
  <option value="both">Bilingual / 雙語</option>
  <option value="en">English only</option>
  <option value="zh">中文 only</option>
</select>
<a
  href={`/transactions/${tx.id}/print?lang=${lang}`}
  target="_blank"
  rel="noopener"
>
  <Button>📄 Print document</Button>
</a>
```

(Wrapping the link in a small client component since `useState` is needed for the dropdown.)

### 7.2. Print CSS

Add to `src/app/globals.css`:

```css
@media print {
  body { background: white !important; color: black !important; }
  @page { size: A4; margin: 20mm; }
  /* Hide non-document chrome on the print page */
  .no-print { display: none !important; }
  /* Keep critical sections together */
  .doc-header, .doc-totals, .doc-signatures, .doc-footer {
    page-break-inside: avoid;
  }
}

/* Bilingual hide rules (also apply to screen, not just print) */
.lang-en .zh-only,
.lang-en .bilingual-only,
.lang-zh .en-only,
.lang-zh .bilingual-only {
  display: none;
}
```

The print page renders **without** the app's `(app)` layout sidebar — it has a minimal own layout that contains only the document.

---

## 8. File structure

### New files

```
src/
  app/(app)/transactions/[id]/
    print/
      page.tsx                       # server component, branches by tx.type
      DocumentLayout.tsx             # shared header/footer (logo, company, signatures, UUID)
      PurchaseOrderBody.tsx
      InvoiceBody.tsx
      CreditNoteBody.tsx
      TransferNoteBody.tsx
      AdjustmentMemoBody.tsx
      FxMemoBody.tsx
    PrintControls.tsx                # client: lang select + print button
  components/
    DocLineItemsTable.tsx            # shared line-items renderer (reused across types)
  lib/
    companyInfo.ts                   # env var reader
    taxRates.ts                      # per-currency defaults
supabase/migrations/
  0006_add_tax_rate_to_transactions.sql
```

### Modified files

- `src/lib/schemas/transaction.ts` — add `taxRateBasisPoints` to 3 schemas.
- `src/lib/actions/transactions.ts` — insert `tax_rate_basis_points`.
- `src/lib/transactionMath.ts` — add `splitTax` + tests.
- `src/lib/supabase/database.types.ts` — patched (manual or via `npm run db:types`).
- `src/components/forms/PurchaseFields.tsx` / `SaleFields.tsx` / `ReturnFields.tsx` — Tax rate % input.
- `src/app/(app)/transactions/[id]/page.tsx` — wire up `PrintControls`.
- `src/app/globals.css` — print + bilingual CSS.
- `.env.local` (operator) + `.env.local.example` (committed).

---

## 9. Acceptance criteria

Plan 2.7 is complete when:

1. `tax_rate_basis_points` column exists on `transactions`.
2. PURCHASE / SALE / RETURN forms have a "Tax rate %" input that auto-fills with the per-currency default and can be overridden.
3. Submitted transactions have the rate stored as basis points.
4. Each transaction detail page has a Language `<select>` + 📄 Print document button.
5. Clicking the button opens `/transactions/[id]/print` in a new tab with the correct `?lang=...`.
6. All 6 document types render correctly:
   - PURCHASE → "Purchase Order / 採購單" with supplier section and line items.
   - SALE → "Invoice / 發票" with customer section.
   - RETURN → "Credit Note / 退貨單" with customer section + linked-sale reference.
   - TRANSFER → "Transfer Note / 調撥單" with source/destination warehouses.
   - ADJUSTMENT → "Adjustment Memo / 調整備忘錄" with the reason.
   - FX_CONVERSION → "FX Conversion Memo / 換匯備忘錄" with derived rate.
7. Logo + company info header present on every doc.
8. Bilingual toggle works (en/zh/both).
9. Tax breakdown shows on PO / Invoice / Credit Note when `tax_rate_basis_points > 0`; hidden otherwise.
10. Tax breakdown never shows on Transfer / Adjustment / FX docs.
11. Browser Print dialog renders to a clean A4 with no sidebar.
12. `splitTax` unit tests pass (~5 new tests); total now ~39.
13. `npm run build` and `npm run lint` clean.
14. Deployed at `trading-erp-five.vercel.app`; operator confirms a real PURCHASE document prints correctly.

---

## 10. Risks and notes

- **Editing the per-currency defaults requires a redeploy.** For the small set of currencies Anpeng uses, this is acceptable. If global tax rates change frequently, we can move defaults into a DB-backed settings table later.
- **The tax-inclusive convention may surprise operators used to tax-exclusive systems.** Documented in the form's helper text and in the documents themselves ("Unit Price (incl. tax) / 單價(含稅)").
- **UUID-prefix doc numbers** look slightly less professional than `PO-2026-0001`. Acceptable for v1; nothing prevents a later upgrade.
- **Many-line transactions may overflow one A4 page.** Acceptable in v1; the table will continue on a second page but the totals section may end up on a partial second page. If it bites, add `page-break` CSS and a "Page X of Y" footer later.
- **Operator must set env vars on Vercel before deploy.** If the env vars are missing, the documents render with fallback placeholders ("Your Company") rather than crashing — the print is still useful for internal records but should not be sent externally.
- **iOS Safari Print dialog limitations.** On iPhones, "Save as PDF" works via the Share sheet from the Print dialog. Operator may need to scroll/pinch to verify layout. Acceptable for occasional use; desktop browser is the primary print path.
- **Tax rate snaps to the per-currency default whenever currency changes.** §5.3's auto-fill applies every time the currency Select fires `onChange`. If the operator wants a custom rate (e.g. export 0%), they type it AFTER picking the currency. This is more predictable than asking "keep manual rate or update?" prompts; matches the "stored at save time → frozen" audit-safety story.
