# Trading ERP — Phase 1, Plan 2.7 (Printable Documents + Tax) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `tax_rate_basis_points` column on transactions with per-currency defaults, plus six bilingual (EN / 繁體中文) printable documents — one per transaction type — accessed from each transaction's detail page via a "📄 Print document" button and a language selector. Browser-native print → Save as PDF; no server-side PDF rendering.

**Architecture:** A new migration adds the tax column. Two new constants modules (`taxRates.ts`, `companyInfo.ts`) hold defaults + env-var-backed company info. `splitTax()` is a pure (TDD'd) helper for the tax-inclusive math. The form components in PURCHASE / SALE / RETURN gain a "Tax rate %" input that auto-snaps to the per-currency default. A new route `/transactions/[id]/print?lang=both|en|zh` is a server component that renders one of six type-specific body components inside a shared `DocumentLayout`. Bilingual visibility is a single CSS class on the root that hides EN/ZH/separator spans via `globals.css` rules.

**Tech Stack:** Same as Plans 1, 2, 2.5, 2.6 — Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + Auth + RLS), Tailwind v4, shadcn/ui on `@base-ui/react`, react-hook-form + zod, Vitest. No new runtime deps; print is browser-native.

**Reference spec:** `docs/superpowers/specs/2026-05-15-trading-erp-phase-1-plan-2.7-printable-documents-design.md`

**Working directory:** `~/trading-erp`

---

## Task 1: Migration `0006_add_tax_rate_to_transactions`

**Files:**
- Create: `~/trading-erp/supabase/migrations/0006_add_tax_rate_to_transactions.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0006_add_tax_rate_to_transactions.sql`:
```sql
alter table transactions
  add column tax_rate_basis_points integer not null default 0;
```

- [ ] **Step 2: Apply to remote DB (operator action — pause here if no auth)**

```bash
cd ~/trading-erp && supabase db push --yes
```

If the subagent's shell doesn't have `SUPABASE_ACCESS_TOKEN`/`SUPABASE_DB_PASSWORD`, stop with NEEDS_CONTEXT — the controller handles auth and re-dispatches (same as in Plan 2.5 and 2.6 T1).

- [ ] **Step 3: Regenerate / patch types**

```bash
cd ~/trading-erp && npm run db:types
```

If the PAT is revoked (same situation as prior plans), stop with NEEDS_CONTEXT — the controller manually patches `src/lib/supabase/database.types.ts` to add `tax_rate_basis_points: number` to the `transactions` Row, Insert (`tax_rate_basis_points?: number`), and Update (`tax_rate_basis_points?: number`) shapes.

- [ ] **Step 4: Commit**

```bash
cd ~/trading-erp
git add supabase/migrations/0006_add_tax_rate_to_transactions.sql src/lib/supabase/database.types.ts
git commit -m "feat(db): add transactions.tax_rate_basis_points (default 0)"
```

---

## Task 2: Constants — `taxRates.ts` + `companyInfo.ts` + env vars

**Files:**
- Create: `~/trading-erp/src/lib/taxRates.ts`
- Create: `~/trading-erp/src/lib/companyInfo.ts`
- Modify: `~/trading-erp/.env.local` (operator-only)
- Modify: `~/trading-erp/.env.local.example`

- [ ] **Step 1: Create `taxRates.ts`**

Create `src/lib/taxRates.ts`:
```ts
import type { CurrencyCode } from "./money";

// Default tax rate (basis points: 100 = 1%, 500 = 5%, 1500 = 15%) suggested
// when an operator picks a currency on PURCHASE / SALE / RETURN. Operator can
// override at save time. Stored on the transaction so reprinting old documents
// always shows the rate that was in force at the time of the transaction.
export const DEFAULT_TAX_BASIS_POINTS: Record<CurrencyCode, number> = {
  NTD: 500,   // Taiwan 5% business tax
  CNY: 100,   // China small-scale-taxpayer 1%; general taxpayers are 13% — override per transaction
  SZL: 1500,  // Eswatini 15% VAT
  ZAR: 1500,  // South Africa 15% VAT
  USD: 0,     // Default for export / unspecified
};

/**
 * Format basis points as a percentage string: 500 -> "5%", 1750 -> "17.5%".
 */
export function formatTaxRate(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(basisPoints % 100 === 0 ? 0 : 2)}%`;
}
```

- [ ] **Step 2: Create `companyInfo.ts`**

Create `src/lib/companyInfo.ts`:
```ts
export type CompanyInfo = {
  nameEn: string;
  nameZh: string;
  addressEn: string;
  addressZh: string;
  taxId: string;
  phone: string;
  email: string;
  logoUrl: string;
};

export function getCompanyInfo(): CompanyInfo {
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

- [ ] **Step 3: Append company env vars to `.env.local`** (operator runs locally; the controller writes them since the file is gitignored)

Append to `~/trading-erp/.env.local`:
```
MY_COMPANY_NAME_EN=ANPENG International Trading Co., Ltd.
MY_COMPANY_NAME_ZH=安彭國際貿易有限公司
MY_COMPANY_ADDRESS_EN=6F, No. 148, Sec. 4, Zhongxiao E. Rd., Da'an Dist., Taipei City, Taiwan
MY_COMPANY_ADDRESS_ZH=台北市大安區忠孝東路四段148號6樓
MY_COMPANY_TAX_ID=60481132
MY_COMPANY_PHONE=0933857545
MY_COMPANY_EMAIL=anpeng.trading@gmail.com
```

The same values must be added to **Vercel project env vars** before T17 deploy (controller does this via `npx vercel env add` or via the dashboard).

- [ ] **Step 4: Update `.env.local.example` with placeholder keys**

Append to `~/trading-erp/.env.local.example`:
```
# Company info shown on printable documents
MY_COMPANY_NAME_EN=Your Company Ltd.
MY_COMPANY_NAME_ZH=
MY_COMPANY_ADDRESS_EN=
MY_COMPANY_ADDRESS_ZH=
MY_COMPANY_TAX_ID=
MY_COMPANY_PHONE=
MY_COMPANY_EMAIL=
```

- [ ] **Step 5: Verify + commit**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -3
git add src/lib/taxRates.ts src/lib/companyInfo.ts .env.local.example
git commit -m "feat: taxRates + companyInfo modules; env var stubs"
```

Expected: lint clean (one pre-existing CashAccountFormDialog warning OK), build succeeds. `.env.local` is gitignored so it's not staged.

---

## Task 3: TDD — `splitTax` helper

**Files:**
- Modify: `~/trading-erp/src/lib/transactionMath.ts`
- Modify: `~/trading-erp/src/lib/__tests__/transactionMath.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/transactionMath.test.ts` (add new `describe` block at the bottom):
```ts
import { splitTax } from "@/lib/transactionMath";

describe("splitTax", () => {
  it("returns the whole amount as subtotal and zero tax when rate is 0", () => {
    expect(splitTax(105000n, 0)).toEqual({ subtotal: 105000n, tax: 0n });
  });

  it("splits 5% inclusive tax (NTD 1050 = NTD 1000 + 50 tax)", () => {
    const result = splitTax(105000n, 500); // 1050.00 in 2-decimal minor
    expect(result.subtotal).toBe(100000n);
    expect(result.tax).toBe(5000n);
  });

  it("splits 15% inclusive tax", () => {
    // 11500 minor total at 15% -> subtotal = 11500 * 10000 / 11500 = 10000; tax = 1500
    const result = splitTax(11500n, 1500);
    expect(result.subtotal).toBe(10000n);
    expect(result.tax).toBe(1500n);
  });

  it("residual goes to tax (subtotal stays clean)", () => {
    // 100 minor at 5%: subtotal = 100 * 10000 / 10500 = 95 (floor); tax = 100 - 95 = 5
    const result = splitTax(100n, 500);
    expect(result.subtotal).toBe(95n);
    expect(result.tax).toBe(5n);
    expect(result.subtotal + result.tax).toBe(100n);
  });

  it("zero total returns zero subtotal and zero tax", () => {
    expect(splitTax(0n, 500)).toEqual({ subtotal: 0n, tax: 0n });
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
cd ~/trading-erp && npm test
```

Expected: 5 splitTax tests fail because the import doesn't exist yet. Existing 34 tests still pass.

- [ ] **Step 3: Implement `splitTax`**

Append to `src/lib/transactionMath.ts`:
```ts
/**
 * Given a tax-inclusive total in minor units and a tax rate in basis points
 * (100 = 1%, 1500 = 15%), return the subtotal (pre-tax) and the tax amount.
 * Any rounding residual is absorbed into the tax field so the subtotal stays
 * a clean "what the goods were worth". subtotal + tax === totalMinor exactly.
 *
 * Returns { subtotal: 0n, tax: 0n } when totalMinor is 0 OR basisPoints <= 0.
 */
export function splitTax(
  totalMinor: bigint,
  basisPoints: number,
): { subtotal: bigint; tax: bigint } {
  if (basisPoints <= 0 || totalMinor === 0n) {
    return { subtotal: totalMinor, tax: 0n };
  }
  const subtotal = (totalMinor * 10000n) / (10000n + BigInt(basisPoints));
  const tax = totalMinor - subtotal;
  return { subtotal, tax };
}
```

- [ ] **Step 4: Verify**

```bash
cd ~/trading-erp && npm test
```

Expected: all 5 splitTax tests pass. Total now ~39 (34 existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transactionMath.ts src/lib/__tests__/transactionMath.test.ts
git commit -m "feat: splitTax pure function for tax-inclusive math with tests"
```

---

## Task 4: zod schema + `createTransaction` updates

**Files:**
- Modify: `~/trading-erp/src/lib/schemas/transaction.ts`
- Modify: `~/trading-erp/src/lib/actions/transactions.ts`

- [ ] **Step 1: Add `taxRateBasisPoints` to PURCHASE/SALE/RETURN schemas**

In `src/lib/schemas/transaction.ts`, find the existing `purchaseSchema`. After its last field, add a new line:

```ts
const purchaseSchema = z.object({
  type: z.literal("PURCHASE"),
  ...baseFields,
  currencyCode: currencyCodeSchema,
  lines: z.array(purchaseLineSchema).min(1),
  cashLegs: z.array(cashLegSchema).min(1),
  supplierId: uuid.nullable().default(null),
  taxRateBasisPoints: z.coerce.number().int().min(0).max(10000).default(0),
});
```

Add the same line (`taxRateBasisPoints: z.coerce.number().int().min(0).max(10000).default(0),`) to both `saleSchema` and `returnSchema`. TRANSFER, ADJUSTMENT, FX_CONVERSION are unchanged.

- [ ] **Step 2: Write `tax_rate_basis_points` in `createTransaction`**

In `src/lib/actions/transactions.ts`, find the existing `.insert({...})` for the parent `transactions` row. Add a `tax_rate_basis_points` field:

```ts
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
    supplier_id: parsed.type === "PURCHASE" ? parsed.supplierId : null,
    customer_id:
      parsed.type === "SALE" || parsed.type === "RETURN" ? parsed.customerId : null,
    tax_rate_basis_points:
      parsed.type === "PURCHASE" || parsed.type === "SALE" || parsed.type === "RETURN"
        ? parsed.taxRateBasisPoints
        : 0,
    created_by: user?.id ?? null,
  })
  .select("id")
  .single();
```

- [ ] **Step 3: Verify**

```bash
cd ~/trading-erp && npm run lint && npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -3
```

Expected: lint clean (one pre-existing warning OK), build succeeds, ~39 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/transaction.ts src/lib/actions/transactions.ts
git commit -m "feat(tx): taxRateBasisPoints on PURCHASE/SALE/RETURN; createTransaction persists it"
```

---

## Task 5: PurchaseFields — Tax rate % input

**Files:**
- Modify: `~/trading-erp/src/components/forms/PurchaseFields.tsx`

- [ ] **Step 1: Add imports**

Add to existing imports at the top:
```tsx
import { DEFAULT_TAX_BASIS_POINTS } from "@/lib/taxRates";
```

- [ ] **Step 2: Add `taxRatePercent` state initialized from the currency default**

In the component body, after the existing `useState` for `currency`, add:
```tsx
const [taxRatePercent, setTaxRatePercent] = useState<string>(
  String(DEFAULT_TAX_BASIS_POINTS[currency] / 100),
);
```

- [ ] **Step 3: Snap the rate when currency changes**

Find the existing currency `<Select onValueChange={(v) => { if (v !== null) setCurrency(v as CurrencyCode); }}>`. Change `onValueChange` so it also resets `taxRatePercent` to the new currency's default:
```tsx
<Select value={currency} onValueChange={(v) => {
  if (v !== null) {
    const next = v as CurrencyCode;
    setCurrency(next);
    setTaxRatePercent(String(DEFAULT_TAX_BASIS_POINTS[next] / 100));
  }
}}>
```

- [ ] **Step 4: Add the Tax rate % input below the currency picker**

In the JSX, locate the `<Label>Currency</Label>` block. Immediately after the closing `</Select>` of that block (still within the same `<div>` or as a new sibling `<div>`), add:

```tsx
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
    Tax-inclusive: amounts you type already include this tax. Document will show the breakdown.
  </p>
</div>
```

Wrap the existing "Supplier" + "Currency" + "Tax rate %" fields in a single grid (e.g. `grid grid-cols-3 gap-4`) if you want them on one row, or leave them stacked vertically. The exact layout is operator-friendliness; keep it simple — `grid grid-cols-3 gap-4` is fine.

- [ ] **Step 5: Include `taxRateBasisPoints` in the `useEffect` payload**

Find the existing `onChange({...})` call inside the useEffect. Add `taxRateBasisPoints` to the payload, computed from `taxRatePercent`:

```tsx
useEffect(() => {
  onChange({
    type: "PURCHASE",
    counterpartyName,
    supplierId,
    currencyCode: currency,
    taxRateBasisPoints: Math.max(
      0,
      Math.min(10000, Math.round(Number(taxRatePercent) * 100) || 0),
    ),
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
}, [counterpartyName, supplierId, currency, taxRatePercent, lines, cashLegs, onChange]);
```

(Note `taxRatePercent` added to the dependency array.)

- [ ] **Step 6: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/PurchaseFields.tsx
git commit -m "feat(purchase): tax rate % input with per-currency default snapping"
```

---

## Task 6: SaleFields — Tax rate % input

**Files:**
- Modify: `~/trading-erp/src/components/forms/SaleFields.tsx`

Same shape as Task 5 but for SALE. Full code below.

- [ ] **Step 1: Add imports**

Add:
```tsx
import { DEFAULT_TAX_BASIS_POINTS } from "@/lib/taxRates";
```

- [ ] **Step 2: Add `taxRatePercent` state**

After the existing `useState` for `currency`:
```tsx
const [taxRatePercent, setTaxRatePercent] = useState<string>(
  String(DEFAULT_TAX_BASIS_POINTS[currency] / 100),
);
```

- [ ] **Step 3: Snap on currency change**

Change the currency Select's `onValueChange`:
```tsx
<Select value={currency} onValueChange={(v) => {
  if (v !== null) {
    const next = v as CurrencyCode;
    setCurrency(next);
    setTaxRatePercent(String(DEFAULT_TAX_BASIS_POINTS[next] / 100));
  }
}}>
```

- [ ] **Step 4: Add the Tax rate % input**

Below the Currency picker, insert:
```tsx
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
    Tax-inclusive: amounts you type already include this tax. Invoice will show the breakdown.
  </p>
</div>
```

- [ ] **Step 5: Include in the `useEffect` payload**

```tsx
useEffect(() => {
  onChange({
    type: "SALE",
    counterpartyName,
    customerId,
    currencyCode: currency,
    taxRateBasisPoints: Math.max(
      0,
      Math.min(10000, Math.round(Number(taxRatePercent) * 100) || 0),
    ),
    lines: lines.filter((l) => l.skuId && l.warehouseId && l.qty && l.unit_price).map((l) => ({
      skuId: l.skuId, warehouseId: l.warehouseId, qty: Number(l.qty), unit_price: l.unit_price,
    })),
    cashLegs: cashLegs.filter((c) => c.cashAccountId && c.amount),
  } as Partial<TransactionInput>);
}, [counterpartyName, customerId, currency, taxRatePercent, lines, cashLegs, onChange]);
```

- [ ] **Step 6: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/SaleFields.tsx
git commit -m "feat(sale): tax rate % input with per-currency default snapping"
```

---

## Task 7: ReturnFields — Tax rate % input (with linked-sale inheritance)

**Files:**
- Modify: `~/trading-erp/src/components/forms/ReturnFields.tsx`

Same pattern as Task 5 BUT with one twist: when the RETURN is linked to a sale via `loadSale`, the tax rate should inherit from that sale (so the credit note's tax matches the original invoice).

- [ ] **Step 1: Add imports**

```tsx
import { DEFAULT_TAX_BASIS_POINTS } from "@/lib/taxRates";
```

- [ ] **Step 2: Add `taxRatePercent` state**

After existing useState declarations:
```tsx
const [taxRatePercent, setTaxRatePercent] = useState<string>(
  String(DEFAULT_TAX_BASIS_POINTS[currency] / 100),
);
```

- [ ] **Step 3: Snap on currency change**

Change the currency Select's `onValueChange` (note: ReturnFields disables it when linked to a sale; still keep the snap behavior for the unlinked case):

```tsx
<Select value={currency} onValueChange={(v) => {
  if (v !== null) {
    const next = v as CurrencyCode;
    setCurrency(next);
    setTaxRatePercent(String(DEFAULT_TAX_BASIS_POINTS[next] / 100));
  }
}} disabled={!!linkedSaleId}>
```

- [ ] **Step 4: Inherit tax rate from linked sale in `loadSale`**

Find the existing `loadSale` function. Update the `.select(...)` on `transactions` to include `tax_rate_basis_points`, and after `setCurrency(...)`, set the tax rate from the sale:

```tsx
async function loadSale(id: string) {
  setLinkedSaleId(id);
  if (!id) {
    setLinkedSaleSummary(null);
    setCustomerId(null);
    setCounterpartyName("");
    return;
  }
  const { data: tx } = await supabase.from("transactions")
    .select("id, counterparty_name, occurred_at, currency_code, customer_id, tax_rate_basis_points")
    .eq("id", id).single();
  // ...everything else stays the same...
  if (tx.currency_code) setCurrency(tx.currency_code as CurrencyCode);
  setTaxRatePercent(String((tx.tax_rate_basis_points ?? 0) / 100));
  // ...rest of function unchanged...
}
```

- [ ] **Step 5: Add the Tax rate % input**

Below the Currency picker:
```tsx
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
    disabled={!!linkedSaleId}
    placeholder={String(DEFAULT_TAX_BASIS_POINTS[currency] / 100)}
  />
  <p className="text-xs text-slate-500 mt-1">
    {linkedSaleId
      ? "Inherited from the linked sale — locked."
      : "Tax-inclusive: amounts you type already include this tax."}
  </p>
</div>
```

- [ ] **Step 6: Include in `useEffect` payload**

```tsx
useEffect(() => {
  onChange({
    type: "RETURN",
    counterpartyName,
    customerId,
    currencyCode: currency,
    taxRateBasisPoints: Math.max(
      0,
      Math.min(10000, Math.round(Number(taxRatePercent) * 100) || 0),
    ),
    fromTransactionId: linkedSaleId,
    lines: lines.filter((l) => l.skuId && l.warehouseId && l.qty && l.unit_price).map((l) => ({
      skuId: l.skuId, warehouseId: l.warehouseId, qty: Number(l.qty),
      unit_price: l.unit_price, intoDamaged: l.intoDamaged,
    })),
    cashLegs: cashLegs.filter((c) => c.cashAccountId && c.amount),
  } as Partial<TransactionInput>);
}, [counterpartyName, customerId, currency, taxRatePercent, linkedSaleId, lines, cashLegs, onChange]);
```

- [ ] **Step 7: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/forms/ReturnFields.tsx
git commit -m "feat(return): tax rate % input; inherits from linked sale when present"
```

---

## Task 8: globals.css — print + bilingual CSS

**Files:**
- Modify: `~/trading-erp/src/app/globals.css`

- [ ] **Step 1: Append print + bilingual rules**

Append at the bottom of `src/app/globals.css`:

```css
/* === Plan 2.7: print documents + bilingual toggle === */

/* Bilingual visibility: a single class on the document root toggles which
   labels show. lang-both shows everything, lang-en hides ZH + bilingual
   separators, lang-zh hides EN + bilingual separators. */
.lang-en .zh-only,
.lang-en .bilingual-only,
.lang-zh .en-only,
.lang-zh .bilingual-only {
  display: none;
}

/* Document layout on screen */
.doc-page {
  background: white;
  color: black;
  max-width: 210mm;
  margin: 0 auto;
  padding: 20mm;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-size: 11pt;
  line-height: 1.4;
}
.doc-page table { width: 100%; border-collapse: collapse; }
.doc-page th, .doc-page td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
.doc-page th { background: #f5f5f5; font-weight: 600; }

@media print {
  /* Clean print: no app chrome */
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
  @page { size: A4; margin: 20mm; }
  /* Avoid splitting critical groups across pages */
  .doc-header, .doc-totals, .doc-signatures, .doc-footer {
    page-break-inside: avoid;
  }
  /* Document page should not have its own padding when @page provides margin */
  .doc-page { padding: 0; max-width: none; margin: 0; }
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/globals.css
git commit -m "feat(print): bilingual + A4 print CSS for documents"
```

---

## Task 9: `DocLineItemsTable` — shared line items component

**Files:**
- Create: `~/trading-erp/src/components/DocLineItemsTable.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { fromMinor, type CurrencyCode } from "@/lib/money";

type Sku = { id: string; code: string; name: string };

export type DocLineItem = {
  sku_id: string;
  qty_delta: number;          // signed; we render abs() for display
  unit_cost_minor: number;    // tax-inclusive
};

type Props = {
  lines: DocLineItem[];
  skus: Sku[];
  currency: CurrencyCode;
  /** Hide price columns when the document doesn't show money (TRANSFER). */
  showPrices?: boolean;
};

export function DocLineItemsTable({ lines, skus, currency, showPrices = true }: Props) {
  const lookup = (id: string) => skus.find((s) => s.id === id);

  return (
    <table>
      <thead>
        <tr>
          <th>
            <span className="en-only">SKU</span>
            <span className="bilingual-only"> / </span>
            <span className="zh-only">料號</span>
          </th>
          <th>
            <span className="en-only">Name</span>
            <span className="bilingual-only"> / </span>
            <span className="zh-only">品名</span>
          </th>
          <th style={{ textAlign: "right" }}>
            <span className="en-only">Qty</span>
            <span className="bilingual-only"> / </span>
            <span className="zh-only">數量</span>
          </th>
          {showPrices && (
            <>
              <th style={{ textAlign: "right" }}>
                <span className="en-only">Unit Price</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">單價</span>
              </th>
              <th style={{ textAlign: "right" }}>
                <span className="en-only">Total</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">小計</span>
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => {
          const sku = lookup(l.sku_id);
          const qty = Math.abs(l.qty_delta);
          const unitMinor = BigInt(l.unit_cost_minor);
          const lineTotal = unitMinor * BigInt(qty);
          return (
            <tr key={i}>
              <td style={{ fontFamily: "monospace" }}>{sku?.code ?? l.sku_id.slice(0, 8)}</td>
              <td>{sku?.name ?? ""}</td>
              <td style={{ textAlign: "right" }}>{qty}</td>
              {showPrices && (
                <>
                  <td style={{ textAlign: "right" }}>{fromMinor(unitMinor, currency)}</td>
                  <td style={{ textAlign: "right" }}>{fromMinor(lineTotal, currency)}</td>
                </>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/components/DocLineItemsTable.tsx
git commit -m "feat(docs): DocLineItemsTable shared component for document bodies"
```

---

## Task 10: `DocumentLayout` — shared header/footer shell

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/DocumentLayout.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Image from "next/image";
import { getCompanyInfo } from "@/lib/companyInfo";

type Props = {
  documentTitleEn: string;
  documentTitleZh: string;
  documentNumber: string;   // e.g. "PO-2a96786a"
  occurredAt: string;       // ISO from transaction
  notes: string;
  transactionUuid: string;
  signatureLines: Array<{ en: string; zh: string }>;
  children: React.ReactNode; // type-specific body
};

export function DocumentLayout({
  documentTitleEn, documentTitleZh, documentNumber, occurredAt, notes,
  transactionUuid, signatureLines, children,
}: Props) {
  const company = getCompanyInfo();

  return (
    <div className="doc-page">
      {/* Header */}
      <div className="doc-header" style={{ display: "flex", gap: "16px", alignItems: "flex-start", borderBottom: "2px solid #333", paddingBottom: "12px" }}>
        <Image src={company.logoUrl} alt="" width={80} height={80} style={{ objectFit: "contain" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "13pt" }}>
            <div className="en-only">{company.nameEn}</div>
            <div className="zh-only">{company.nameZh}</div>
          </div>
          <div style={{ fontSize: "10pt", marginTop: "4px" }}>
            <div className="en-only">{company.addressEn}</div>
            <div className="zh-only">{company.addressZh}</div>
            <div>
              {company.taxId && <>Tax ID: {company.taxId}</>}
              {company.phone && <> &middot; Tel: {company.phone}</>}
              {company.email && <> &middot; {company.email}</>}
            </div>
          </div>
        </div>
      </div>

      {/* Title + number + date */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", margin: "20px 0 12px" }}>
        <h1 style={{ fontSize: "18pt", fontWeight: 700, margin: 0 }}>
          <span className="en-only">{documentTitleEn}</span>
          <span className="bilingual-only"> </span>
          <span className="zh-only">{documentTitleZh}</span>
        </h1>
        <div style={{ fontSize: "10pt", textAlign: "right" }}>
          <div><strong>No.:</strong> {documentNumber}</div>
          <div><strong>Date:</strong> {new Date(occurredAt).toISOString().slice(0, 10)}</div>
        </div>
      </div>

      {/* Body */}
      {children}

      {/* Notes */}
      {notes && (
        <div style={{ marginTop: "16px", fontSize: "10pt" }}>
          <strong>
            <span className="en-only">Notes</span>
            <span className="bilingual-only"> / </span>
            <span className="zh-only">備註</span>:
          </strong>{" "}
          {notes}
        </div>
      )}

      {/* Signatures */}
      <div className="doc-signatures" style={{ marginTop: "40px", display: "grid", gridTemplateColumns: `repeat(${signatureLines.length}, 1fr)`, gap: "32px" }}>
        {signatureLines.map((s, i) => (
          <div key={i} style={{ borderTop: "1px solid #333", paddingTop: "6px", fontSize: "10pt" }}>
            <span className="en-only">{s.en}</span>
            <span className="bilingual-only"> / </span>
            <span className="zh-only">{s.zh}</span>: ____________________
          </div>
        ))}
      </div>

      {/* UUID footer */}
      <div className="doc-footer" style={{ marginTop: "32px", fontSize: "8pt", color: "#888", textAlign: "center" }}>
        Transaction ID: {transactionUuid}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/print/DocumentLayout.tsx
git commit -m "feat(docs): DocumentLayout shared shell (header, title, signatures, footer)"
```

---

## Task 11: `PurchaseOrderBody`

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/PurchaseOrderBody.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { fromMinor, type CurrencyCode } from "@/lib/money";
import { splitTax } from "@/lib/transactionMath";
import { formatTaxRate } from "@/lib/taxRates";
import { DocLineItemsTable, type DocLineItem } from "@/components/DocLineItemsTable";

type Partner = {
  name: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
};

type Props = {
  supplier: Partner | null;
  counterpartyNameFallback: string;
  lines: DocLineItem[];
  skus: Array<{ id: string; code: string; name: string }>;
  currency: CurrencyCode;
  taxRateBasisPoints: number;
};

export function PurchaseOrderBody({
  supplier, counterpartyNameFallback, lines, skus, currency, taxRateBasisPoints,
}: Props) {
  // Compute total = sum of qty * unit_cost
  const totalMinor = lines.reduce(
    (acc, l) => acc + BigInt(Math.abs(l.qty_delta)) * BigInt(l.unit_cost_minor),
    0n,
  );
  const { subtotal, tax } = splitTax(totalMinor, taxRateBasisPoints);

  return (
    <>
      {/* Counterparty section */}
      <div style={{ marginBottom: "16px", padding: "8px 12px", background: "#fafafa", border: "1px solid #ddd" }}>
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>
          <span className="en-only">Supplier</span>
          <span className="bilingual-only"> / </span>
          <span className="zh-only">供應商</span>:
        </div>
        {supplier ? (
          <>
            <div><strong>{supplier.name}</strong></div>
            <div style={{ fontSize: "10pt" }}>
              {[supplier.country, supplier.contact_person, supplier.email, supplier.phone].filter(Boolean).join(" · ")}
            </div>
            {supplier.address && <div style={{ fontSize: "10pt" }}>{supplier.address}</div>}
            {supplier.tax_id && <div style={{ fontSize: "10pt" }}>Tax ID: {supplier.tax_id}</div>}
          </>
        ) : (
          <div>{counterpartyNameFallback || "—"}</div>
        )}
      </div>

      {/* Line items */}
      <DocLineItemsTable lines={lines} skus={skus} currency={currency} showPrices />

      {/* Totals */}
      <div className="doc-totals" style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ minWidth: "300px" }}>
          <tbody>
            {taxRateBasisPoints > 0 && (
              <>
                <tr>
                  <td>
                    <span className="en-only">Subtotal</span>
                    <span className="bilingual-only"> / </span>
                    <span className="zh-only">小計</span>:
                  </td>
                  <td style={{ textAlign: "right" }}>{fromMinor(subtotal, currency)} {currency}</td>
                </tr>
                <tr>
                  <td>
                    <span className="en-only">Tax</span>
                    <span className="bilingual-only"> / </span>
                    <span className="zh-only">稅金</span> ({formatTaxRate(taxRateBasisPoints)}):
                  </td>
                  <td style={{ textAlign: "right" }}>{fromMinor(tax, currency)} {currency}</td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: "2px solid #333", fontWeight: 700 }}>
              <td>
                <span className="en-only">Total</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">總計</span>:
              </td>
              <td style={{ textAlign: "right" }}>{fromMinor(totalMinor, currency)} {currency}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/print/PurchaseOrderBody.tsx
git commit -m "feat(docs): PurchaseOrderBody with counterparty + tax breakdown"
```

---

## Task 12: `InvoiceBody`

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/InvoiceBody.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { fromMinor, type CurrencyCode } from "@/lib/money";
import { splitTax } from "@/lib/transactionMath";
import { formatTaxRate } from "@/lib/taxRates";
import { DocLineItemsTable, type DocLineItem } from "@/components/DocLineItemsTable";

type Partner = {
  name: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
};

type Props = {
  customer: Partner | null;
  counterpartyNameFallback: string;
  lines: DocLineItem[];
  skus: Array<{ id: string; code: string; name: string }>;
  currency: CurrencyCode;
  taxRateBasisPoints: number;
};

export function InvoiceBody({
  customer, counterpartyNameFallback, lines, skus, currency, taxRateBasisPoints,
}: Props) {
  const totalMinor = lines.reduce(
    (acc, l) => acc + BigInt(Math.abs(l.qty_delta)) * BigInt(l.unit_cost_minor),
    0n,
  );
  const { subtotal, tax } = splitTax(totalMinor, taxRateBasisPoints);

  return (
    <>
      <div style={{ marginBottom: "16px", padding: "8px 12px", background: "#fafafa", border: "1px solid #ddd" }}>
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>
          <span className="en-only">Customer</span>
          <span className="bilingual-only"> / </span>
          <span className="zh-only">客戶</span>:
        </div>
        {customer ? (
          <>
            <div><strong>{customer.name}</strong></div>
            <div style={{ fontSize: "10pt" }}>
              {[customer.country, customer.contact_person, customer.email, customer.phone].filter(Boolean).join(" · ")}
            </div>
            {customer.address && <div style={{ fontSize: "10pt" }}>{customer.address}</div>}
            {customer.tax_id && <div style={{ fontSize: "10pt" }}>Tax ID: {customer.tax_id}</div>}
          </>
        ) : (
          <div>{counterpartyNameFallback || "—"}</div>
        )}
      </div>

      <DocLineItemsTable lines={lines} skus={skus} currency={currency} showPrices />

      <div className="doc-totals" style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ minWidth: "300px" }}>
          <tbody>
            {taxRateBasisPoints > 0 && (
              <>
                <tr>
                  <td>
                    <span className="en-only">Subtotal</span>
                    <span className="bilingual-only"> / </span>
                    <span className="zh-only">小計</span>:
                  </td>
                  <td style={{ textAlign: "right" }}>{fromMinor(subtotal, currency)} {currency}</td>
                </tr>
                <tr>
                  <td>
                    <span className="en-only">Tax</span>
                    <span className="bilingual-only"> / </span>
                    <span className="zh-only">稅金</span> ({formatTaxRate(taxRateBasisPoints)}):
                  </td>
                  <td style={{ textAlign: "right" }}>{fromMinor(tax, currency)} {currency}</td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: "2px solid #333", fontWeight: 700 }}>
              <td>
                <span className="en-only">Total</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">總計</span>:
              </td>
              <td style={{ textAlign: "right" }}>{fromMinor(totalMinor, currency)} {currency}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: "16px", fontSize: "9pt", color: "#666" }}>
        <span className="en-only">This document serves as both invoice and delivery order.</span>
        <span className="bilingual-only"> / </span>
        <span className="zh-only">本文件兼作發票及送貨單。</span>
      </p>
    </>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/print/InvoiceBody.tsx
git commit -m "feat(docs): InvoiceBody (combined invoice + delivery for v1)"
```

---

## Task 13: `CreditNoteBody`

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/CreditNoteBody.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { fromMinor, type CurrencyCode } from "@/lib/money";
import { splitTax } from "@/lib/transactionMath";
import { formatTaxRate } from "@/lib/taxRates";
import { DocLineItemsTable, type DocLineItem } from "@/components/DocLineItemsTable";

type Partner = {
  name: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  tax_id: string;
  address: string;
};

type Props = {
  customer: Partner | null;
  counterpartyNameFallback: string;
  linkedSaleNumber: string | null;
  lines: DocLineItem[];
  skus: Array<{ id: string; code: string; name: string }>;
  currency: CurrencyCode;
  taxRateBasisPoints: number;
};

export function CreditNoteBody({
  customer, counterpartyNameFallback, linkedSaleNumber, lines, skus, currency, taxRateBasisPoints,
}: Props) {
  const totalMinor = lines.reduce(
    (acc, l) => acc + BigInt(Math.abs(l.qty_delta)) * BigInt(l.unit_cost_minor),
    0n,
  );
  const { subtotal, tax } = splitTax(totalMinor, taxRateBasisPoints);

  return (
    <>
      <div style={{ marginBottom: "16px", padding: "8px 12px", background: "#fafafa", border: "1px solid #ddd" }}>
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>
          <span className="en-only">Customer</span>
          <span className="bilingual-only"> / </span>
          <span className="zh-only">客戶</span>:
        </div>
        {customer ? (
          <>
            <div><strong>{customer.name}</strong></div>
            <div style={{ fontSize: "10pt" }}>
              {[customer.country, customer.contact_person, customer.email, customer.phone].filter(Boolean).join(" · ")}
            </div>
          </>
        ) : (
          <div>{counterpartyNameFallback || "—"}</div>
        )}
        {linkedSaleNumber && (
          <div style={{ marginTop: "6px", fontSize: "10pt" }}>
            <span className="en-only">Refund for sale</span>
            <span className="bilingual-only"> / </span>
            <span className="zh-only">退款依據銷售單</span>:{" "}
            <span style={{ fontFamily: "monospace" }}>{linkedSaleNumber}</span>
          </div>
        )}
      </div>

      <DocLineItemsTable lines={lines} skus={skus} currency={currency} showPrices />

      <div className="doc-totals" style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
        <table style={{ minWidth: "300px" }}>
          <tbody>
            {taxRateBasisPoints > 0 && (
              <>
                <tr>
                  <td>
                    <span className="en-only">Subtotal</span>
                    <span className="bilingual-only"> / </span>
                    <span className="zh-only">小計</span>:
                  </td>
                  <td style={{ textAlign: "right" }}>{fromMinor(subtotal, currency)} {currency}</td>
                </tr>
                <tr>
                  <td>
                    <span className="en-only">Tax</span>
                    <span className="bilingual-only"> / </span>
                    <span className="zh-only">稅金</span> ({formatTaxRate(taxRateBasisPoints)}):
                  </td>
                  <td style={{ textAlign: "right" }}>{fromMinor(tax, currency)} {currency}</td>
                </tr>
              </>
            )}
            <tr style={{ borderTop: "2px solid #333", fontWeight: 700 }}>
              <td>
                <span className="en-only">Total Refunded</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">退款總額</span>:
              </td>
              <td style={{ textAlign: "right" }}>{fromMinor(totalMinor, currency)} {currency}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/print/CreditNoteBody.tsx
git commit -m "feat(docs): CreditNoteBody with linked-sale reference"
```

---

## Task 14: Three internal-doc bodies — TransferNote + AdjustmentMemo + FxMemo

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/TransferNoteBody.tsx`
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/AdjustmentMemoBody.tsx`
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/FxMemoBody.tsx`

- [ ] **Step 1: Create `TransferNoteBody.tsx`**

```tsx
import { DocLineItemsTable, type DocLineItem } from "@/components/DocLineItemsTable";
import type { CurrencyCode } from "@/lib/money";

type Props = {
  sourceWarehouse: { id: string; name: string; is_damaged: boolean } | null;
  destinationWarehouse: { id: string; name: string; is_damaged: boolean } | null;
  // For TRANSFER we have 2 stock_movements per SKU (one negative source, one positive dest).
  // Pass the positive (destination) rows to render qty + SKU cleanly.
  positiveStockMovements: DocLineItem[];
  skus: Array<{ id: string; code: string; name: string }>;
};

export function TransferNoteBody({ sourceWarehouse, destinationWarehouse, positiveStockMovements, skus }: Props) {
  return (
    <>
      <div style={{ marginBottom: "16px", padding: "8px 12px", background: "#fafafa", border: "1px solid #ddd" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              <span className="en-only">From</span>
              <span className="bilingual-only"> / </span>
              <span className="zh-only">來源</span>:
            </div>
            <div>{sourceWarehouse?.name ?? "—"}{sourceWarehouse?.is_damaged ? " (Damaged / 不良品)" : ""}</div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>
              <span className="en-only">To</span>
              <span className="bilingual-only"> / </span>
              <span className="zh-only">目的地</span>:
            </div>
            <div>{destinationWarehouse?.name ?? "—"}{destinationWarehouse?.is_damaged ? " (Damaged / 不良品)" : ""}</div>
          </div>
        </div>
      </div>

      {/* TRANSFER doesn't show prices; we use a fake currency for the table type signature. */}
      <DocLineItemsTable
        lines={positiveStockMovements}
        skus={skus}
        currency={"NTD" as CurrencyCode}
        showPrices={false}
      />
    </>
  );
}
```

- [ ] **Step 2: Create `AdjustmentMemoBody.tsx`**

```tsx
import { fromMinor, type CurrencyCode } from "@/lib/money";

type Props = {
  reason: string;          // tx.notes for ADJUSTMENT contains the reason
  stockSide: { skuCode: string; skuName: string; warehouseName: string; qty_delta: number } | null;
  cashSide: { accountName: string; amount_minor_delta: number; currency_code: string } | null;
};

export function AdjustmentMemoBody({ reason, stockSide, cashSide }: Props) {
  return (
    <>
      <div style={{ marginBottom: "16px" }}>
        <strong>
          <span className="en-only">Reason</span>
          <span className="bilingual-only"> / </span>
          <span className="zh-only">原因</span>:
        </strong>{" "}
        {reason || "—"}
      </div>

      {stockSide && (
        <table>
          <thead>
            <tr>
              <th>
                <span className="en-only">SKU</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">料號</span>
              </th>
              <th>
                <span className="en-only">Name</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">品名</span>
              </th>
              <th>
                <span className="en-only">Warehouse</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">倉庫</span>
              </th>
              <th style={{ textAlign: "right" }}>
                <span className="en-only">Qty delta</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">數量變動</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontFamily: "monospace" }}>{stockSide.skuCode}</td>
              <td>{stockSide.skuName}</td>
              <td>{stockSide.warehouseName}</td>
              <td style={{ textAlign: "right", color: stockSide.qty_delta < 0 ? "#b00" : "#080" }}>
                {stockSide.qty_delta > 0 ? "+" : ""}{stockSide.qty_delta}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {cashSide && (
        <table>
          <thead>
            <tr>
              <th>
                <span className="en-only">Cash account</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">現金帳戶</span>
              </th>
              <th>
                <span className="en-only">Currency</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">幣別</span>
              </th>
              <th style={{ textAlign: "right" }}>
                <span className="en-only">Amount delta</span>
                <span className="bilingual-only"> / </span>
                <span className="zh-only">金額變動</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{cashSide.accountName}</td>
              <td>{cashSide.currency_code}</td>
              <td style={{ textAlign: "right", color: cashSide.amount_minor_delta < 0 ? "#b00" : "#080" }}>
                {fromMinor(BigInt(cashSide.amount_minor_delta), cashSide.currency_code as CurrencyCode)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
}
```

- [ ] **Step 3: Create `FxMemoBody.tsx`**

```tsx
import { fromMinor, currencyDecimals, type CurrencyCode } from "@/lib/money";
import { deriveFxRate } from "@/lib/transactionMath";

type Props = {
  sourceAccountName: string;
  sourceAmountMinor: number; // negative (cash leaving)
  sourceCurrency: string;
  destinationAccountName: string;
  destinationAmountMinor: number; // positive
  destinationCurrency: string;
};

export function FxMemoBody({
  sourceAccountName, sourceAmountMinor, sourceCurrency,
  destinationAccountName, destinationAmountMinor, destinationCurrency,
}: Props) {
  const srcMinor = BigInt(Math.abs(sourceAmountMinor));
  const dstMinor = BigInt(Math.abs(destinationAmountMinor));
  let rateText = "—";
  try {
    const rate = deriveFxRate(
      srcMinor, currencyDecimals(sourceCurrency as CurrencyCode),
      dstMinor, currencyDecimals(destinationCurrency as CurrencyCode),
    );
    rateText = `1 ${sourceCurrency} = ${rate.toFixed(4)} ${destinationCurrency}`;
  } catch { /* ignore — leave rateText as "—" */ }

  return (
    <>
      <div style={{ marginBottom: "16px", padding: "8px 12px", background: "#fafafa", border: "1px solid #ddd" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              <span className="en-only">From account</span>
              <span className="bilingual-only"> / </span>
              <span className="zh-only">來源帳戶</span>:
            </div>
            <div>{sourceAccountName} ({sourceCurrency})</div>
            <div style={{ marginTop: "4px", fontFamily: "monospace" }}>
              − {fromMinor(srcMinor, sourceCurrency as CurrencyCode)} {sourceCurrency}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>
              <span className="en-only">To account</span>
              <span className="bilingual-only"> / </span>
              <span className="zh-only">目的帳戶</span>:
            </div>
            <div>{destinationAccountName} ({destinationCurrency})</div>
            <div style={{ marginTop: "4px", fontFamily: "monospace" }}>
              + {fromMinor(dstMinor, destinationCurrency as CurrencyCode)} {destinationCurrency}
            </div>
          </div>
        </div>
        <div style={{ marginTop: "12px", fontSize: "10pt", textAlign: "center" }}>
          <strong>
            <span className="en-only">Implied rate</span>
            <span className="bilingual-only"> / </span>
            <span className="zh-only">換算匯率</span>:
          </strong>{" "}
          {rateText}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/print/
git commit -m "feat(docs): TransferNoteBody + AdjustmentMemoBody + FxMemoBody"
```

---

## Task 15: Print route — `print/page.tsx`

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/print/page.tsx`

- [ ] **Step 1: Create the print page**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CurrencyCode } from "@/lib/money";
import { DocumentLayout } from "./DocumentLayout";
import { PurchaseOrderBody } from "./PurchaseOrderBody";
import { InvoiceBody } from "./InvoiceBody";
import { CreditNoteBody } from "./CreditNoteBody";
import { TransferNoteBody } from "./TransferNoteBody";
import { AdjustmentMemoBody } from "./AdjustmentMemoBody";
import { FxMemoBody } from "./FxMemoBody";

type SearchParams = { lang?: string };

const DOC_PREFIX: Record<string, string> = {
  PURCHASE: "PO",
  SALE: "INV",
  RETURN: "CN",
  TRANSFER: "TRF",
  ADJUSTMENT: "ADJ",
  FX_CONVERSION: "FX",
};

const DOC_TITLES_EN: Record<string, string> = {
  PURCHASE: "Purchase Order",
  SALE: "Invoice",
  RETURN: "Credit Note",
  TRANSFER: "Transfer Note",
  ADJUSTMENT: "Adjustment Memo",
  FX_CONVERSION: "FX Conversion Memo",
};
const DOC_TITLES_ZH: Record<string, string> = {
  PURCHASE: "採購單",
  SALE: "發票",
  RETURN: "退貨單",
  TRANSFER: "調撥單",
  ADJUSTMENT: "調整備忘錄",
  FX_CONVERSION: "換匯備忘錄",
};

const SIGNATURE_LINES: Record<string, Array<{ en: string; zh: string }>> = {
  PURCHASE: [{ en: "Authorized by", zh: "授權人" }, { en: "Received by", zh: "接收人" }],
  SALE:     [{ en: "Issued by", zh: "開立人" }, { en: "Received by", zh: "接收人" }],
  RETURN:   [{ en: "Issued by", zh: "開立人" }, { en: "Received by", zh: "接收人" }],
  TRANSFER: [{ en: "Despatched by", zh: "發貨人" }, { en: "Received by", zh: "接收人" }],
  ADJUSTMENT: [{ en: "Authorized by", zh: "授權人" }],
  FX_CONVERSION: [{ en: "Authorized by", zh: "授權人" }],
};

export default async function TransactionPrintPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const lang = (sp.lang === "en" || sp.lang === "zh") ? sp.lang : "both";

  const supabase = await createClient();

  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (!tx) notFound();

  // Load all related data in parallel.
  const [
    { data: stock }, { data: cash }, { data: skus }, { data: warehouses }, { data: accts },
  ] = await Promise.all([
    supabase.from("stock_movements").select("*").eq("transaction_id", id),
    supabase.from("cash_movements").select("*").eq("transaction_id", id),
    supabase.from("skus").select("id, code, name"),
    supabase.from("warehouses").select("id, name, is_damaged"),
    supabase.from("cash_accounts").select("id, name, currency_code"),
  ]);

  const supplier = tx.supplier_id
    ? (await supabase.from("suppliers").select("name, country, contact_person, email, phone, tax_id, address").eq("id", tx.supplier_id).maybeSingle()).data
    : null;
  const customer = tx.customer_id
    ? (await supabase.from("customers").select("name, country, contact_person, email, phone, tax_id, address").eq("id", tx.customer_id).maybeSingle()).data
    : null;

  const docNumber = `${DOC_PREFIX[tx.type] ?? "DOC"}-${id.slice(0, 8)}`;
  const currency = (tx.currency_code ?? "NTD") as CurrencyCode;

  let body: React.ReactNode;
  switch (tx.type) {
    case "PURCHASE":
      body = (
        <PurchaseOrderBody
          supplier={supplier}
          counterpartyNameFallback={tx.counterparty_name}
          lines={(stock ?? []).map((m) => ({ sku_id: m.sku_id, qty_delta: m.qty_delta, unit_cost_minor: m.unit_cost_minor }))}
          skus={skus ?? []}
          currency={currency}
          taxRateBasisPoints={tx.tax_rate_basis_points ?? 0}
        />
      );
      break;
    case "SALE":
      body = (
        <InvoiceBody
          customer={customer}
          counterpartyNameFallback={tx.counterparty_name}
          lines={(stock ?? []).map((m) => ({ sku_id: m.sku_id, qty_delta: m.qty_delta, unit_cost_minor: m.unit_cost_minor }))}
          skus={skus ?? []}
          currency={currency}
          taxRateBasisPoints={tx.tax_rate_basis_points ?? 0}
        />
      );
      break;
    case "RETURN":
      body = (
        <CreditNoteBody
          customer={customer}
          counterpartyNameFallback={tx.counterparty_name}
          linkedSaleNumber={tx.from_transaction_id ? `INV-${tx.from_transaction_id.slice(0, 8)}` : null}
          lines={(stock ?? []).map((m) => ({ sku_id: m.sku_id, qty_delta: m.qty_delta, unit_cost_minor: m.unit_cost_minor }))}
          skus={skus ?? []}
          currency={currency}
          taxRateBasisPoints={tx.tax_rate_basis_points ?? 0}
        />
      );
      break;
    case "TRANSFER": {
      // Source movements are negative, destination movements are positive — pick the positive set for rendering.
      const positive = (stock ?? []).filter((m) => m.qty_delta > 0);
      const sourceMv = (stock ?? []).find((m) => m.qty_delta < 0);
      const destMv = positive[0];
      const sourceWh = sourceMv ? (warehouses ?? []).find((w) => w.id === sourceMv.warehouse_id) ?? null : null;
      const destWh = destMv ? (warehouses ?? []).find((w) => w.id === destMv.warehouse_id) ?? null : null;
      body = (
        <TransferNoteBody
          sourceWarehouse={sourceWh}
          destinationWarehouse={destWh}
          positiveStockMovements={positive.map((m) => ({ sku_id: m.sku_id, qty_delta: m.qty_delta, unit_cost_minor: m.unit_cost_minor }))}
          skus={skus ?? []}
        />
      );
      break;
    }
    case "ADJUSTMENT": {
      const stockMv = (stock ?? [])[0];
      const cashMv = (cash ?? [])[0];
      const stockSide = stockMv ? {
        skuCode: (skus ?? []).find((s) => s.id === stockMv.sku_id)?.code ?? stockMv.sku_id.slice(0, 8),
        skuName: (skus ?? []).find((s) => s.id === stockMv.sku_id)?.name ?? "",
        warehouseName: (warehouses ?? []).find((w) => w.id === stockMv.warehouse_id)?.name ?? "",
        qty_delta: stockMv.qty_delta,
      } : null;
      const cashSide = cashMv ? {
        accountName: (accts ?? []).find((a) => a.id === cashMv.cash_account_id)?.name ?? "",
        amount_minor_delta: cashMv.amount_minor_delta,
        currency_code: (accts ?? []).find((a) => a.id === cashMv.cash_account_id)?.currency_code ?? "",
      } : null;
      body = (
        <AdjustmentMemoBody
          reason={tx.notes}
          stockSide={stockSide}
          cashSide={cashSide}
        />
      );
      break;
    }
    case "FX_CONVERSION": {
      const sourceMv = (cash ?? []).find((c) => c.amount_minor_delta < 0);
      const destMv = (cash ?? []).find((c) => c.amount_minor_delta > 0);
      if (!sourceMv || !destMv) {
        body = <p>FX_CONVERSION transaction is missing one of its two cash legs — data integrity issue.</p>;
        break;
      }
      const sourceAcct = (accts ?? []).find((a) => a.id === sourceMv.cash_account_id);
      const destAcct = (accts ?? []).find((a) => a.id === destMv.cash_account_id);
      body = (
        <FxMemoBody
          sourceAccountName={sourceAcct?.name ?? ""}
          sourceAmountMinor={sourceMv.amount_minor_delta}
          sourceCurrency={sourceAcct?.currency_code ?? ""}
          destinationAccountName={destAcct?.name ?? ""}
          destinationAmountMinor={destMv.amount_minor_delta}
          destinationCurrency={destAcct?.currency_code ?? ""}
        />
      );
      break;
    }
    default:
      body = <p>Unknown transaction type.</p>;
  }

  return (
    <div className={`lang-${lang}`}>
      <DocumentLayout
        documentTitleEn={DOC_TITLES_EN[tx.type] ?? "Document"}
        documentTitleZh={DOC_TITLES_ZH[tx.type] ?? "文件"}
        documentNumber={docNumber}
        occurredAt={tx.occurred_at}
        notes={tx.notes ?? ""}
        transactionUuid={tx.id}
        signatureLines={SIGNATURE_LINES[tx.type] ?? []}
      >
        {body}
      </DocumentLayout>
    </div>
  );
}
```

- [ ] **Step 2: Add a route group `layout.tsx` that strips the sidebar**

Create `~/trading-erp/src/app/(app)/transactions/[id]/print/layout.tsx`:
```tsx
// Minimal layout for printable docs: no sidebar, no app chrome.
// Overrides the (app) layout for /transactions/[id]/print/* routes.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white">{children}</div>;
}
```

This wraps the print page in a plain white div, sidestepping the sidebar in `(app)/layout.tsx`.

- [ ] **Step 3: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/print/
git commit -m "feat(print): print page wires all 6 doc bodies + minimal layout"
```

Expected: build succeeds; `/transactions/[id]/print` appears in route table.

---

## Task 16: `PrintControls` + wire into transaction detail page

**Files:**
- Create: `~/trading-erp/src/app/(app)/transactions/[id]/PrintControls.tsx`
- Modify: `~/trading-erp/src/app/(app)/transactions/[id]/page.tsx`

- [ ] **Step 1: Create the client component**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = { transactionId: string };

export function PrintControls({ transactionId }: Props) {
  const [lang, setLang] = useState<"both" | "en" | "zh">("both");

  return (
    <div className="flex gap-2 items-center no-print">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as "both" | "en" | "zh")}
        className="border rounded px-2 py-1 text-sm"
        aria-label="Document language"
      >
        <option value="both">Bilingual / 雙語</option>
        <option value="en">English only</option>
        <option value="zh">中文 only</option>
      </select>
      <a
        href={`/transactions/${transactionId}/print?lang=${lang}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="default">📄 Print document</Button>
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Wire `PrintControls` into the detail page**

In `src/app/(app)/transactions/[id]/page.tsx`, find the existing top section that renders the title and Reverse button. It currently looks like:

```tsx
<div className="flex justify-between items-start">
  <div>
    <h1 className="text-2xl font-semibold">{tx.type}</h1>
    <p className="text-slate-600">{new Date(tx.occurred_at).toLocaleString()}</p>
  </div>
  {!reversedBy && <ReverseDialog originalId={tx.id} />}
</div>
```

Replace with:

```tsx
<div className="flex justify-between items-start">
  <div>
    <h1 className="text-2xl font-semibold">{tx.type}</h1>
    <p className="text-slate-600">{new Date(tx.occurred_at).toLocaleString()}</p>
  </div>
  <div className="flex gap-3 items-start">
    <PrintControls transactionId={tx.id} />
    {!reversedBy && <ReverseDialog originalId={tx.id} />}
  </div>
</div>
```

Add the import at the top of `page.tsx`:
```tsx
import { PrintControls } from "./PrintControls";
```

- [ ] **Step 3: Verify + commit**

```bash
cd ~/trading-erp && npm run build 2>&1 | tail -3
git add src/app/\(app\)/transactions/\[id\]/PrintControls.tsx src/app/\(app\)/transactions/\[id\]/page.tsx
git commit -m "feat(transactions): PrintControls (lang select + print button) on detail page"
```

---

## Task 17: Deploy + smoke test

**Files:** none (operator action + verification)

- [ ] **Step 1: Set Vercel env vars (operator + controller)**

The controller sets the company info env vars in Vercel via CLI:

```bash
cd ~/trading-erp
for env in production preview development; do
  printf "ANPENG International Trading Co., Ltd." | npx vercel env add MY_COMPANY_NAME_EN $env
  printf "安彭國際貿易有限公司" | npx vercel env add MY_COMPANY_NAME_ZH $env
  printf "6F, No. 148, Sec. 4, Zhongxiao E. Rd., Da'an Dist., Taipei City, Taiwan" | npx vercel env add MY_COMPANY_ADDRESS_EN $env
  printf "台北市大安區忠孝東路四段148號6樓" | npx vercel env add MY_COMPANY_ADDRESS_ZH $env
  printf "60481132" | npx vercel env add MY_COMPANY_TAX_ID $env
  printf "0933857545" | npx vercel env add MY_COMPANY_PHONE $env
  printf "anpeng.trading@gmail.com" | npx vercel env add MY_COMPANY_EMAIL $env
done
```

(If interactive prompts get in the way per past Plan 2.5 experience, the controller falls back to the Vercel dashboard env-vars UI.)

- [ ] **Step 2: Final pre-push verification**

```bash
cd ~/trading-erp
npm run lint 2>&1 | tail -3
npm test 2>&1 | tail -3
npm run build 2>&1 | tail -5
```

Expected: lint clean (one pre-existing warning OK), 39 tests pass, build succeeds with `/transactions/[id]/print` in route table.

- [ ] **Step 3: Push**

```bash
git push
```

- [ ] **Step 4: Wait + curl check**

```bash
sleep 90
echo "/login (200):"
curl -s -m 15 -o /dev/null -w "  HTTP %{http_code}\n" https://trading-erp-five.vercel.app/login
echo "Some print route (307 redirect to login when unauthenticated):"
curl -s -m 15 -o /dev/null -w "  HTTP %{http_code}\n" https://trading-erp-five.vercel.app/transactions/00000000-0000-0000-0000-000000000000/print
```

Expected: /login = 200; print route = 307 (auth required).

- [ ] **Step 5: OPERATOR — exercise on production**

Sign in. For each of the 6 transaction types you have an existing transaction for:

1. Go to `/transactions/<id>`.
2. Confirm the new Language `<select>` + 📄 Print document button appear next to the Reverse button.
3. Pick **Bilingual** + click **📄 Print document** → new tab opens.
4. Verify: Anpeng logo top-left, EN + ZH company name, EN + ZH address, Tax ID/Phone/Email line, document title in both languages, doc number `<PREFIX>-<uuid8>`, line items table with bilingual column headers, **tax breakdown** (Subtotal / Tax / Total) for PURCHASE/SALE/RETURN when `tax_rate_basis_points > 0`, just **Total** otherwise, signature lines bilingual, UUID footer.
5. Try **English only** + **中文 only** — verify the unwanted language hides.
6. Press Cmd/Ctrl+P → confirm the print preview shows a clean A4 page with no sidebar.

For a PURCHASE you create after this plan, confirm:
- The new "Tax rate %" field appears on the form.
- Picking NTD pre-fills 5, CNY → 1, SZL → 15, ZAR → 15, USD → 0.
- Override is possible.
- The transaction's detail page shows the right Subtotal / Tax / Total breakdown on the printable document.

- [ ] **Step 6: Update `CLAUDE.md`**

```bash
cd ~/trading-erp
# Edit CLAUDE.md: change Plan 2.7 row to "shipped YYYY-MM-DD".
# Add a "What Plan 2.7 delivered" section similar to prior plans.
git add CLAUDE.md
git commit -m "docs: mark plan 2.7 shipped"
git push
```

---

## End of Plan 2.7

**Acceptance check (from spec §9):**

- [ ] `transactions.tax_rate_basis_points` column exists.
- [ ] PURCHASE/SALE/RETURN forms have a Tax rate % input that auto-snaps to the per-currency default (NTD 5, CNY 1, SZL 15, ZAR 15, USD 0).
- [ ] Stored on the transaction at save time.
- [ ] Each transaction detail page has Language select + 📄 Print document button.
- [ ] Print button opens `/transactions/[id]/print` in a new tab with the selected `?lang=…`.
- [ ] All 6 doc types render with title, counterparty (where applicable), line items, totals, signatures, UUID footer.
- [ ] Logo + company info from env vars appear in the header.
- [ ] Bilingual toggle (en / zh / both) hides the unwanted language(s).
- [ ] Tax breakdown shows on PO / Invoice / Credit Note when `tax_rate_basis_points > 0`; hidden otherwise.
- [ ] Tax breakdown never shows on Transfer / Adjustment / FX docs.
- [ ] Browser Print dialog renders to a clean A4 with no sidebar.
- [ ] `splitTax` unit tests pass; total now ~39.
- [ ] `npm run build` and `npm run lint` clean.
- [ ] Deployed at `trading-erp-five.vercel.app`; operator confirms one PURCHASE document prints correctly.

When all are ticked, Plan 2.7 is shipped — next plan in the queue is Plan 3 (Overview dashboard), the final plan of Phase 1.
