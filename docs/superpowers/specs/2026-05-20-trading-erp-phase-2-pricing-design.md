# Trading ERP — Phase 2 Design: Pricing Engine

**Date:** 2026-05-20
**Status:** Approved — proceed to implementation
**Repo:** `~/trading-erp` (separate from backpack-customizer)

---

## 1. Purpose

Phase 1 operators type sale prices by hand. Phase 2 adds a rule-based pricing engine: define prices per SKU × customer context × date window, and the sale form auto-populates `unit_price` when a customer and quantity are selected.

---

## 2. Schema (5 additions)

### `customer_types`
Operator-defined top-level classifications (B2B, B2C, Distributor, …).
```
id uuid PK, name text UNIQUE NOT NULL, created_at, created_by
```

### `customer_tiers`
Sub-classifications scoped to a type (Gold under B2B, etc.).
```
id uuid PK, customer_type_id → customer_types, name text NOT NULL,
UNIQUE(customer_type_id, name), created_at, created_by
```

### `customers` — two new columns
```
customer_type_id → customer_types (nullable)
customer_tier_id → customer_tiers (nullable)
```
Server action validates tier belongs to the selected type.

### `price_rules`
One row per pricing context. All dimension columns are nullable — null means "match any".
```
id uuid PK,
sku_id → skus NOT NULL,
customer_type_id → customer_types (nullable),
customer_tier_id → customer_tiers (nullable),
country text (nullable),
currency_code text NOT NULL,
valid_from date NOT NULL,
valid_until date (nullable),
is_promotion bool DEFAULT false,
priority int DEFAULT 0,
created_at, created_by
```

### `price_bands`
Volume break-points within a rule. Cascade-delete with rule.
```
id uuid PK,
rule_id → price_rules ON DELETE CASCADE,
min_qty int NOT NULL CHECK (min_qty >= 1),
unit_price_local_minor bigint NOT NULL,
unit_price_usd_minor bigint NOT NULL,
UNIQUE(rule_id, min_qty)
```
Flat-price rules have exactly one band with `min_qty = 1`.

---

## 3. Rule Resolution

**Input:** sku_id, customer (type, tier, country), sale_date, qty, currency_code

**Step 1 — filter** active rules:
- `sku_id` matches
- `currency_code` matches
- `valid_from ≤ sale_date` AND (`valid_until IS NULL` OR `valid_until ≥ sale_date`)
- `customer_type_id IS NULL` OR matches customer's type
- `customer_tier_id IS NULL` OR matches customer's tier
- `country IS NULL` OR matches customer's country

**Step 2 — rank** by specificity (count of non-null optional dimensions: type + tier + country = 0–3), then `is_promotion DESC`, `priority DESC`, `valid_from DESC`.

**Step 3 — pick top rule**, then the band with the highest `min_qty ≤ qty`.

**Step 4 — return** `unit_price_local_minor` + `unit_price_usd_minor`. If no match → return null (operator types manually).

The lookup runs as a Postgres function (or equivalent TypeScript over the filtered rows) invoked from a Server Action.

---

## 4. UI & Navigation

### New sidebar item: "Pricing" (between Cash accounts and Suppliers)

### `/pricing` page — two panels:
1. **Customer types & tiers** — expandable list; inline dialogs for create/edit/delete type and tier (same pattern as SKUs page).
2. **Price rules** — table: SKU | Type | Tier | Country | Currency | Valid from | Valid until | Promo | Priority. "New rule" opens a full-page form (or large dialog) with a repeatable bands sub-table (min qty / local price / USD price rows).

### Customer form updates
Two new fields below Country:
- **Customer type** — select from `customer_types`
- **Tier** — select from that type's tiers (clears when type changes)

### Sale form auto-populate
1. Customer selected → store their type_id, tier_id, country, currency in form state.
2. Each SKU line: when SKU + qty filled → call `lookupPrice` server action → `setValue("unit_price", formatted result)`.
3. Auto-filled field shows a small **"suggested"** badge. Operator edits remove the badge.
4. No match → field stays blank, no badge.

---

## 5. Files

### Migrations
- `0007_add_customer_types_tiers.sql` — customer_types, customer_tiers, alter customers
- `0008_add_price_rules.sql` — price_rules, price_bands

### New lib
- `src/lib/schemas/pricing.ts` — zod schemas for customerType, customerTier, priceRule
- `src/lib/actions/pricing.ts` — CRUD server actions for types/tiers/rules
- `src/lib/pricing.ts` — `lookupPrice()` pure function + server action wrapper

### New pages
- `src/app/(app)/pricing/page.tsx`
- `src/app/(app)/pricing/_components/CustomerTypesPanel.tsx`
- `src/app/(app)/pricing/_components/PriceRulesPanel.tsx`
- `src/app/(app)/pricing/_components/PriceRuleForm.tsx`

### Modified
- `src/components/AppSidebar.tsx` + `src/components/MobileNav.tsx` — add Pricing nav item
- `src/app/(app)/customers/CustomerFormDialog.tsx` — add type + tier fields
- `src/components/forms/SaleFields.tsx` — auto-populate unit_price

---

## 6. Acceptance Criteria

1. Operator can create/edit/delete customer types and tiers at `/pricing`.
2. Customer form has type + tier selectors; tier list filters to selected type.
3. Operator can create a price rule with multiple bands (flat or tiered).
4. Sale form auto-fills `unit_price` when customer + SKU + qty are all set and a rule matches.
5. USD reference price stored alongside local price in every band.
6. No match leaves field blank — operator can always type manually.
7. `npm run build` and all 39 tests pass.
