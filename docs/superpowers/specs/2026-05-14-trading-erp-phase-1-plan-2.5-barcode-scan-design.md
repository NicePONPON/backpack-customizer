# Trading ERP — Phase 1, Plan 2.5 Design (Barcode + Bulk Scan)

**Date:** 2026-05-14
**Status:** Draft pending user review
**Scope:** Phase 1, Plan 2.5. Adds camera-based barcode/QR scanning with bulk-entry mode to the four transactional forms shipped in Plan 2.

> **Note:** Plan 1 shipped 2026-05-13. Plan 2 shipped 2026-05-14 at https://trading-erp-five.vercel.app. This spec lives in `backpack-customizer/docs/superpowers/specs/` for continuity with prior plans; should eventually move into the `trading-erp` repo.

**Reference docs:**
- Phase 1 umbrella spec: `2026-05-12-trading-erp-phase-1-design.md`
- Plan 2 spec: `2026-05-13-trading-erp-phase-1-plan-2-transactions-design.md`

---

## 1. Purpose

The single-operator (or 3-user) trading business often receives goods in bulk — 50 boxes off a truck, half of them the same SKU repeated. Typing each line by hand is slow and error-prone. This plan adds **device-camera barcode/QR scanning** integrated into the existing transaction forms, with a **bulk-scan mode** that consolidates duplicates and lets the operator review one consolidated table at the end.

### What Plan 2.5 builds

1. A `skus.barcode` column (any 1D barcode or 2D code string, unique-when-set).
2. The `/skus` create/edit dialog gains an optional "Barcode / QR code" field.
3. A reusable `ScanModal` component opened from a "📷 Scan barcodes" button on PURCHASE, SALE, RETURN, and TRANSFER forms. The modal contains the camera feed, a running tally of scanned items, and a merge step that populates the parent form's line items table on close.

### Out of scope (deferred)

- **Multiple barcodes per SKU** (e.g. case-of-6 vs single-unit have different codes) — v1 is 1:1.
- **Self-printed labels** with custom barcodes — Phase 2.
- **QR code generation** — Phase 2.
- **Bluetooth handheld scanners** — these appear as a keyboard; a future iteration can add a "scanner input mode" (focused input field that captures typed strokes). Plan 2.5 uses the device camera only.
- **Offline scanning** — likely works since the library is loaded client-side, but not explicitly tested in v1.

---

## 2. Confirmed design decisions

These are the resolutions of the brainstorm and binding for implementation.

### 2.1. Scanner integration: a modal inside existing forms (not a new route)

The "📷 Scan barcodes" button appears next to "+ Add line" on the four affected forms. Clicking it opens `ScanModal` — a full-screen modal that captures items and, on Done, merges them into the parent form's line items table. The form remains visible underneath; the operator returns to the same form to enter prices and submit normally.

This was chosen over a separate `/scan` route because the workflow is "I'm filling a transaction" — owning the form context is more important than a dedicated scanning surface.

### 2.2. Continuous camera detection with a stop/start toggle

The library runs in continuous-detection mode. When a barcode is read cleanly, the matching row's qty is incremented (or a new row is created) with a brief green flash + soft chime — no popup or button press required. A **large stop/start toggle in the modal's top bar** lets the operator pause detection (e.g. when editing the tally without accidental scans).

A **1000ms cooldown per code** prevents the "I lingered on a barcode and now qty is 47" problem: after a successful read, the same code is ignored for 1s while other codes continue to be readable.

### 2.3. Auto-consolidate by SKU; qty always editable

Multiple scans of the same code → one row, qty incremented. The qty cell is **always editable** during the modal session, so the bulk shortcut is: scan once, type `qty = 50` instead of scanning 49 more times.

### 2.4. Unknown codes block submit until resolved

A scanned code that does not match any `skus.barcode` becomes a placeholder row `?? × <code>` in the tally. The Done button stays disabled while any `??` row exists. Each unknown row has a "Resolve…" action that opens a small dialog:
- **Map to existing SKU** — pick from a list (uses the same picker pattern as the inline-create flow from Plan 2). The barcode is then saved to that SKU's row (so future scans of the same code resolve automatically).
- **Create new SKU with this barcode** — opens a slim create dialog (name + optional country/notes), pre-fills the barcode field, and creates the SKU on save. The unknown row converts to a normal row pointing at the new SKU.

### 2.5. Manual entry coexists with scanning

Inside the modal, an "+ Add manually" button below the tally lets the operator type a SKU + qty without scanning — for damaged labels, items without a code, or when the camera misreads. Uses the existing `SkuLinePicker` pattern.

### 2.6. Scan area sized for both 1D and 2D codes

The overlay rectangle is **wider than tall** to accommodate 1D barcodes, but tall enough that a QR code fits comfortably inside:
- `width: 80vw`, `height: 50vw`, max `420 × 260`.
- The camera **scans the full frame** (not just inside the overlay); the overlay is alignment guidance, not a crop.
- The library's `qrbox` config gets the same dimensions for internal preprocessing parity.

The overlay shows a subtle hint inside (e.g. `[ ▢ QR ]  [ ▮▮▮ 1D ▮▮▮ ]`) to communicate both formats are accepted.

### 2.7. Library: `html5-qrcode`

Wraps ZXing under the hood; supports the full set of 1D codes (UPC-A/E, EAN-8/13, Code128, Code39, ITF, Codabar) and 2D codes (QR, Data Matrix, Aztec, PDF417). Handles iOS Safari camera quirks cleanly. ~85 KB gzipped, lazy-imported only on `/new`. MIT-licensed. Final commitment; alternatives (`@zxing/browser`, `quagga2`) are noted as fallbacks but not implemented.

### 2.8. Merge behavior on Done

When the operator clicks Done in the modal, the tally merges into the parent form's line items table:

- **Form was empty** → tally rows become the line items (each with blank `unit_price`, awaiting operator).
- **Form already has rows** → for each tally row, if a line item exists with the same `(SKU, warehouse)`, add the qty (preserve the existing `unit_price` the operator may have typed). If no match, append as a new line.
- **Cancel** → modal session discarded; the form is untouched.

The `(SKU, warehouse)` pair matters because the same SKU may legitimately be split across warehouses in a single transaction (rare but allowed by the schema). The modal asks the operator for a single warehouse at session start (default: the warehouse on the first existing line, if any).

---

## 3. Schema migration

Single migration: `supabase/migrations/0004_add_barcode_to_skus.sql`

```sql
alter table skus add column barcode text;
create unique index idx_skus_barcode on skus (barcode) where barcode is not null;
```

After application, regenerate types: `npm run db:types`.

The unique constraint is **partial** — many SKUs can have NULL, but at most one SKU per non-null barcode. This prevents the same barcode pointing to two different products (an error condition rather than a feature).

Validation in zod / form: non-empty if set, max length 50 (accommodates the longest realistic Code128 strings). No format-specific check (operator might be scanning a QR code containing free-form text — that's fine).

---

## 4. ScanModal — UX

Full-screen modal. Mobile-first layout. Closes by clicking ✕, Cancel, or Done.

### 4.1. Layout

```
┌────────────────────────────────────────┐
│  [✕]    Scanning…    [Stop ⏸]         │  ← top bar: close, status, big toggle
├────────────────────────────────────────┤
│ Warehouse: [▼ Taiwan       ]           │  ← per-session warehouse picker
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │     Camera feed                  │  │  ← live, ~50vw tall
│  │  ┌──────────────────────────┐    │  │
│  │  │ [▢ QR]   [▮▮▮ 1D ▮▮▮]   │    │  │  ← overlay rectangle
│  │  └──────────────────────────┘    │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Last read: 4901234567894 → SKU-A      │  ← feedback line
├────────────────────────────────────────┤
│  Tally                                 │
│  ────────────────────────────────────  │
│  SKU-A Cotton tee Blue   × [3]    ✕    │
│  SKU-B Cotton tee Red    × [1]    ✕    │
│  ?? 4901999XXXXXX        × [2]  [Resolve…] │
│  + Add manually                        │
├────────────────────────────────────────┤
│  [Cancel]              [Done (6) →]    │  ← Done disabled while ?? exists
└────────────────────────────────────────┘
```

### 4.2. Top bar

- **Close (✕):** same as Cancel — discards session, returns to form unchanged.
- **Status text:** "Scanning…" when active, "Paused" when stopped.
- **Stop/Start toggle:** large (~40% of the top bar width), single-tap-reachable. Flips between camera-on and camera-off. Camera-off freezes the feed and stops detection.

### 4.3. Warehouse picker

A `Select` directly below the top bar. Lists all warehouses (live + damaged) from the parent form's data. Default value:
- The warehouse on the first existing line item in the parent form, if any.
- Otherwise the first live warehouse (China).

Operator can change at any time during the session. Changing the warehouse **does not** re-bin existing tally rows; it only affects new tally rows created from that point onward. (UI shows a tooltip on hover explaining this.)

### 4.4. Camera view + overlay

- Full live feed.
- Overlay rectangle centered, `width: 80vw, height: 50vw, max 420×260`.
- On successful read: brief green flash on the overlay border + soft chime (Web Audio API; respects browser autoplay rules — chime is enabled after the first user-initiated tap-to-allow-sound, similar to how mobile games handle audio).
- Feedback line below the camera shows the latest read code → resolved SKU (or "unknown").

### 4.5. Tally section

- Scrollable list of rows. Each row:
  - **Resolved row:** `<SKU code> <SKU name>   × [qty input]   [✕]`
  - **Unknown row:** `?? <scanned-code>   × [qty input]   [Resolve…]   [✕]`
- Qty input: numeric, editable at any time. Min 1; ✕ removes the row entirely.
- Resolve dialog: see §2.4 above.
- "+ Add manually" button: opens a small inline form (SkuLinePicker + qty input) that appends a row to the tally. Once added, behaves like any other row.

### 4.6. Bottom bar

- **Cancel:** discards the session. The parent form's line items are untouched.
- **Done (N → ):** N = count of resolved rows. Disabled when any `??` row exists. On click, merges into the parent form per §2.8.

### 4.7. Camera permissions

On first open, the browser prompts for camera access.

- **Granted:** camera feed appears, detection starts.
- **Denied or unavailable** (e.g. no camera on this device): camera view is replaced with a friendly message ("Camera unavailable — use Add manually below"). Tally and manual entry still work normally.
- **Camera permission revocation mid-session:** rare; on next attempt the modal shows the fallback and the operator can re-grant via browser settings.

The modal explicitly calls `stop()` on the html5-qrcode instance on unmount so the camera light turns off when the modal closes.

---

## 5. Where the button appears

A single button labeled **"📷 Scan barcodes"** is rendered in four form components:

- `PurchaseFields.tsx` — next to "+ Add line"
- `SaleFields.tsx` — next to "+ Add line"
- `ReturnFields.tsx` — only when the RETURN is NOT linked to a sale (because linked RETURNs have their lines auto-populated and locked; scanning into them doesn't make sense)
- `TransferFields.tsx` — next to "+ Add line"

The button receives:
- The current value of `lines` (so merge knows what to preserve)
- A setter to update `lines`
- The currency code (PURCHASE/SALE/RETURN only — needed if we later show prices in the modal; not in v1)
- The list of live warehouses

Not added to ADJUSTMENT (single-line correction; scan doesn't help) or FX_CONVERSION (no stock).

---

## 6. Files and file structure

```
src/
  components/
    forms/
      ScanModal.tsx                  # the modal — top bar, warehouse picker, camera, tally, bottom bar
      ScanTallyTable.tsx             # subcomponent: the running tally + qty inputs
      ScanResolveDialog.tsx          # the Map-or-Create dialog for ?? rows
  lib/
    barcode/
      mergeTally.ts                  # pure function: merge tally rows into existing form lines (TDD)
  app/(app)/
    skus/
      SkuFormDialog.tsx              # MODIFY — add Barcode field
    new/
      [the form components]          # MODIFY — add 📷 button
supabase/migrations/
  0004_add_barcode_to_skus.sql
```

### Server action changes

- `createSku` (in `src/lib/actions/skus.ts`) gains an optional `barcode: string | null` parameter — the modal's create-new-SKU path passes the scanned code. Existing callers can ignore the parameter (default null). Backward-compatible.
- `updateSku` similarly accepts `barcode`.
- New `findSkuByBarcode(code: string): Promise<{ id: string; code: string; name: string } | null>` server action used by the scan modal to resolve codes server-side. Trivial; just a `select`.

### zod schema additions

- `skuInputSchema` (in `src/lib/schemas/sku.ts`) gains `barcode: z.string().trim().max(50).nullable().optional()`.

---

## 7. mergeTally — pure function for TDD

`src/lib/barcode/mergeTally.ts`

```ts
type TallyRow = { skuId: string; warehouseId: string; qty: number };
type FormLine = { skuId: string; warehouseId: string; qty: number; unit_price: string };

export function mergeTally(existing: FormLine[], tally: TallyRow[]): FormLine[];
```

Behavior:
1. For each tally row, find an existing line with the same `(skuId, warehouseId)`.
2. If found, return a copy of `existing` with that line's qty increased by the tally row's qty; `unit_price` preserved.
3. If not found, append a new line with `unit_price: ""`.
4. Original `existing` array is not mutated.

Tests cover: empty existing + tally, non-empty existing with matching SKU+wh, non-empty with same SKU but different warehouse (stays separate), same SKU same warehouse different price (preserves existing price), multiple tally rows merging into different existing lines.

---

## 8. Validation rules

| Rule | Where |
|---|---|
| `skus.barcode` non-empty if set, max length 50 | zod refine + DB partial unique index |
| Same barcode cannot be assigned to two different SKUs | DB constraint (partial unique index) |
| Done blocked while any `??` row exists | UI button state |
| Done blocked if tally is empty (nothing to merge) | UI button state |
| Warehouse must be selected before any scan registers | UI; the Start toggle is disabled until a warehouse is picked |
| Scan modal disposes camera on unmount | useEffect cleanup; verified manually |

---

## 9. Acceptance criteria

Plan 2.5 is complete when:

1. `skus.barcode` column exists, the `/skus` create/edit dialog has the "Barcode / QR code" field, and the DB partial unique index enforces uniqueness.
2. PURCHASE, SALE, RETURN (unlinked only), and TRANSFER forms have a "📷 Scan barcodes" button next to "+ Add line".
3. Clicking the button opens the full-screen `ScanModal` with camera feed, scan area sized for both QR and 1D codes, large stop/start toggle, running tally, and warehouse picker.
4. Continuous detection works on a real mobile device (operator's phone, browser: Safari iOS and Chrome Android): pointing at a known barcode auto-increments the matching row's qty within ~1 second.
5. 1000ms cooldown verified — holding the camera on one code does not spam the tally.
6. Unknown codes appear as `?? × <code>` rows; the Done button is disabled while any exist.
7. Resolve dialog works: both "Map to existing SKU" (updates SKU's barcode in DB) and "Create new SKU with this barcode" paths.
8. Manual entry via "+ Add manually" works while camera is off and on.
9. Qty inputs are editable with a minimum of 1; the ✕ button explicitly removes a row.
10. Done merges into the form's line items per the rules in §8 — verified via `mergeTally` unit tests + manual end-to-end.
11. Cancel + ✕ both leave the form untouched.
12. Camera permission denial shows the manual-entry fallback.
13. Camera turns off on modal close (verified by indicator light on phone).
14. `npm test` passes; new mergeTally tests included; total now 29 + ~5 = ~34.
15. `npm run build` and `npm run lint` are clean.
16. Deployed at `trading-erp-five.vercel.app` and tested on at least one mobile device.

---

## 10. Open implementation notes

- **html5-qrcode lazy-load:** import dynamically inside `ScanModal` (`const { Html5Qrcode } = await import("html5-qrcode")`) so the ~85kb library doesn't ship with every page — only the `/new` chunk grows.
- **Chime audio:** small (~1kb) base64-encoded `audio/wav` or a Web Audio API beep. Must be triggered AFTER a user gesture (browser autoplay rules); the modal opens via a tap, so the first scan's chime works fine.
- **iOS Safari camera idiosyncrasies:** `getUserMedia` requires HTTPS (Vercel is HTTPS — fine). On iOS, the camera prompt only shows once per origin per session; user has to revoke via Settings to retest the denial path.
- **Performance:** html5-qrcode runs detection at ~10-15fps on mid-range phones. For our use case (occasional warehouse receiving, not factory-floor speed), this is plenty.
- **TRANSFER warehouse semantics:** TRANSFER has source + destination warehouses; the modal's "session warehouse" picker becomes "session destination warehouse" since stock arrives at destination. The source is whatever the form's source field already has — scanning doesn't change it.

---

## 11. Risks

- **Inaccurate codes (damaged labels):** mitigated by the "+ Add manually" path inside the modal — operator never blocked.
- **iOS Safari camera permission cache:** if the user denies once, they have to use Settings to re-grant. We show the fallback so they're never stuck.
- **Library size growth on /new:** ~85kb gzipped is the cost of the feature; only added to `/new` via lazy import; acceptable.
- **`(SKU, warehouse)` separation surprising new users:** if a user scans the same SKU but later changes the warehouse picker, the new scans land in a separate row. Documented in the field tooltip; not a real bug.
