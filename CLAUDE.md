# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

No test suite is configured.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 (`@tailwindcss/postcss`). Path alias `@/*` → `src/*` (see `tsconfig.json`).

## Architecture

This is a single-page, client-side **backpack color + embroidery customizer**. Everything lives in `src/app/page.tsx` ("use client") and two SVG renderer components in `src/components/`.

### How the bag gets colored

The two SVG assets under `public/LaptopBackpack_16_Front.svg` and `public/LaptopBackpack_16_Back.svg` contain **dozens of `<path>` elements** grouped into named `<g>` layers exported from Illustrator. `FrontSVG.tsx` and `BackSVG.tsx` each:

1. `fetch()` the SVG, inject the raw markup via `innerHTML` into a `<div ref>`.
2. Walk every `<path>`, derive a **logical group key** from the nearest ancestor `<g>` with a meaningful `id`, and attach `onclick` + apply `fill` if `colors[group]` is set.
3. Re-run the whole effect whenever `colors` changes.

The `colors` state in `page.tsx` is keyed by the **logical group** (e.g. `BACK_MAIN`, `BAND`, `FRONT_BACK_SIDE`), not the raw SVG id. Many raw ids collapse into one group — e.g. `Back_Main_1` through `Back_Main_7` all map to `BACK_MAIN`, and both `Front_Side*` and `Back_Side*` deliberately merge into `FRONT_BACK_SIDE` so side panels stay consistent across views. The mapping lives in `resolveGroup()` + `matchPrefix()` (plus `normalizeId()` for the Illustrator `_x5F_` quirk) inside each SVG component and **must be kept identical between `FrontSVG` and `BackSVG`**.

### SVG quirks to know before editing

These are the non-obvious things that break if you don't know about them:

- **Front SVG uses Illustrator `_x5F_` encoding** in its ids (e.g. `Front_x5F_Side_x5F_R`). Back SVG uses plain underscores (`Back_Side_R`). Any group-matching logic that looks at raw ids needs to normalize `_x5F_` → `_` or it will silently miss every Front-side path.
- **Back SVG has 4-level nested `<g>`** (e.g. `Bottom` → `Bottom-2` → `Bottom1` → `uuid-…` → `<path>`). `path.closest("g")` returns the innermost wrapper (often a `uuid-…` id that matches nothing). To resolve the logical group you must walk up the ancestor chain and match the first `<g id>` that has a known prefix.
- **Aspect ratios differ between the two views.** Front SVG viewBox is `992.13 × 992.13` (square); Back SVG viewBox is `622.13 × 881.02` (~0.706, portrait). The `/texture/*-Overlay.png` files in `public/texture/` are both 1000×1000. The SVG and the PNG overlay are stacked absolutely inside the same container in `page.tsx`; for their edges to line up, the container's aspect ratio must match the SVG's viewBox (the PNG is stretched to the container).
- **Invisible paths need a transparent fill** (`rgba(0,0,0,0.01)` in the current code) and `pointer-events: all`, otherwise un-colored regions are not clickable.

### Part name display

`getDisplayName()` lives in `src/lib/bagReference.ts` and is re-exported from `page.tsx` / `invoice/page.tsx`. It maps raw-id prefixes back to human-readable labels shown in the summary table. When you add or rename a group, you must update **three places**: the `getGroup` logic in both SVG components, the `COLOR_GROUPS` palette if relevant, and `getDisplayName` in `bagReference.ts`.

## Invoice / quotation feature

A second route `/invoice` (`src/app/invoice/page.tsx`) produces a printable quotation for the current design. Entry flow:

1. The designer page serializes the live `DesignState` (colors, embroidery, zipper, size) into a URL-safe base64 `?d=` param — see `src/lib/invoiceSerialization.ts` (`encodeDesign` / `decodeDesign`). The encoding uses `-` / `_` instead of `+` / `/` and strips `=` padding so the link survives WhatsApp, email, and similar carriers.
2. `/invoice?d=…` decodes the param inside a `Suspense` boundary (required — `useSearchParams` suspends in Next.js 16) and renders `InvoiceDocument`.
3. `InvoiceDocument` is an A4-sized page captured as a PNG via `html2canvas` (scale=2, `useCORS: true`) then wrapped into a PDF with `jspdf`. Export uses the Web Share API when the device supports file sharing, and falls back to direct download.

### Pricing semantics — tax-inclusive

`src/lib/pricing.ts` is the single source of truth. **Base prices in `BASE_PRICES_SZL` / `ZIPPER_UPGRADE_PRICE_SZL` / `EMBROIDERY_PRICES_SZL` are the tax-inclusive amounts quoted to customers.** Pre-tax values are derived at render time:

```
unitPreSZL = unitInclSZL / (1 + taxRate)
```

Every `LineItem` carries both `unitPreSZL` / `unitInclSZL` and `lineTotalPreSZL` / `lineTotalInclSZL`. The invoice table shows both columns in parallel. `taxRate` and `taxLabel` come from `CURRENCIES[currency]` — SZL is 17% VAT, ZAR 15%, USD 0% (export), TWD 5%. If you change base prices, you're changing what customers pay — the pre-tax math automatically follows.

`computePricing()` also applies:
- Volume discount tiers (`VOLUME_TIERS`): 10% at 200+, 15% at 500+, 20% at 1000+ pcs. Discount is applied to both pre-tax and incl.-tax subtotals proportionally.
- MOQ check (`MOQ = 200`): `meetsMoq` flag surfaces as a warning banner in the rendered invoice, but does not block submission.

FX rates in `CURRENCIES[*].rateFromSZL` are placeholders — the `TODO: finalize FX rates and tax treatment with finance` note flags this. ZAR is pegged 1:1 to SZL and is real.

### Invoice bag preview — the back-clip trick

`src/components/InvoiceBagPreview.tsx` renders front + back bag graphics side by side inside the invoice. It has one non-obvious layout compensator that is easy to break:

- `BACK_CALIBRATION.scaleY ≈ 0.715` (in `overlayCalibration.ts`) squishes the back PNG vertically so its edges match the back SVG. When rendered inside a normal square container, this leaves big empty bands top and bottom and makes the back bag read **smaller** than the front at the same container width.
- To visually equalize the two views, the back is rendered into an **oversized** inner div of width `width * (1 / 0.715)` (= `BACK_VISUAL_SCALE`), positioned at `top: 0, left: -backOverflow` (where `backOverflow = (backWidth - width) / 2`), inside a square outer container of the same `width × width` as the front, with `overflow: hidden`.
- `top: 0` (not `top: -backOverflow`) is deliberate: anchoring the oversized render to the top of the clip window keeps the bag's head visible. The clipped strip at the bottom is the calibration's empty padding, so nothing real is lost. Centering the content vertically instead — which feels intuitive — crops the head by ~50px at the current calibration.
- The outer row uses `alignItems: flex-end` so the two bags share a bottom baseline regardless of internal offsets.

If you change `BACK_CALIBRATION.scaleY`, you must update `BACK_VISUAL_SCALE` to match (it is `1 / scaleY`).
