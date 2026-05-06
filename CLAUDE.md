# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server at http://localhost:3000
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint (flat config in `eslint.config.mjs`, extends `next/core-web-vitals` + `next/typescript`)

No test suite is configured.

## Deployment

- **Vercel project**: `backpack-customizer-v2.vercel.app`
- **Vercel watches**: `claude-test` branch (not `main`)
- To deploy: `git push origin main:claude-test` (pushes main → claude-test so Vercel picks it up)
- Both branches should stay in sync; commit to `main`, then push to `claude-test` to deploy

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 (`@tailwindcss/postcss`). Path alias `@/*` → `src/*` (see `tsconfig.json`).

External services: **Supabase** (auth + database), **Resend** (transactional email).

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/app/page.tsx` | Home / landing page |
| `/customize` | `src/app/customize/page.tsx` | B2B designer tool — full color + embroidery + zipper customizer |
| `/studio` | `src/app/studio/page.tsx` | B2C consumer studio — vote for a colorway, win a free bag |
| `/gallery` | `src/app/gallery/` | Lookbook — product photography + community top styles |
| `/invoice` | `src/app/invoice/page.tsx` | Printable/exportable PDF quotation |
| `/shop` | `src/app/shop/page.tsx` | Shop placeholder |
| `/auth/callback` | `src/app/auth/callback/route.ts` | OAuth + magic-link callback, saves design, redirects |
| `/api/preorder` | `src/app/api/preorder/route.ts` | Sends `PREORDER10` discount code via Resend |
| `/api/send-invoice` | `src/app/api/send-invoice/route.ts` | Emails invoice PDF via Resend |

## Key Components

| Component | Purpose |
|-----------|---------|
| `SiteHeader.tsx` | Sticky header: centered logo (links home), language toggle + currency selector stacked on the right |
| `SubNav.tsx` | Navigation bar below header: Home / Lookbook / Customize / Studio / Shop |
| `LanguageToggle.tsx` | EN / 中文 pill toggle, writes `NEXT_LOCALE` cookie |
| `CurrencySelector.tsx` | SZL / ZAR / USD / TWD dropdown with flag circles |
| `FrontSVG.tsx` | Renders + colors the front bag SVG; handles embroidery text overlay |
| `BackSVG.tsx` | Renders + colors the back bag SVG; crops viewBox to remove empty bottom space |
| `PngOverlayLayer.tsx` | Stacks a texture PNG over the SVG using calibration transforms |
| `BagDimensionGuides.tsx` | Dimension arrows (cm) overlaid on the bag at correct scale |
| `EmbroideryControls.tsx` | Embroidery text, color, position, font, line-size controls |
| `ZipperPullControls.tsx` | Zipper upgrade toggle + color picker |
| `CommunityGallery.tsx` | Fetches top voted designs + launched design from Supabase; renders voting cards |
| `MiniBackpack.tsx` | Small (140px) front-bag preview used inside gallery cards |
| `SaveDesignModal.tsx` | Google OAuth sign-in modal; encodes design into redirect URL so it survives auth |
| `PreorderModal.tsx` | Email input modal; POSTs to `/api/preorder` to send `PREORDER10` code |
| `InvoiceBagPreview.tsx` | Front + back bag side-by-side for the invoice page |

## Architecture

### How the bag gets colored

The two SVG assets under `public/LaptopBackpack_16_Front.svg` and `public/LaptopBackpack_16_Back.svg` contain **dozens of `<path>` elements** grouped into named `<g>` layers exported from Illustrator. `FrontSVG.tsx` and `BackSVG.tsx` each:

1. `fetch()` the SVG, inject the raw markup via `innerHTML` into a `<div ref>`.
2. Walk every `<path>`, derive a **logical group key** from the nearest ancestor `<g>` with a meaningful `id`, and attach `onclick` + apply `fill` if `colors[group]` is set.
3. Re-run the whole effect whenever `colors` changes.

The `colors` state is keyed by **logical group** (e.g. `BACK_MAIN`, `BAND`, `FRONT_BACK_SIDE`), not the raw SVG id. The mapping lives in `resolveGroup()` + `matchPrefix()` (plus `normalizeId()` for the `_x5F_` quirk) inside each SVG component and **must be kept identical between `FrontSVG` and `BackSVG`**.

When you add or rename a group, update **three places**: `resolveGroup` in both SVG components, `COLOR_GROUPS` in `src/lib/bagReference.ts`, and `getDisplayName` in `bagReference.ts`.

### SVG quirks

- **Front SVG uses Illustrator `_x5F_` encoding** in ids (e.g. `Front_x5F_Side_x5F_R`). Back SVG uses plain underscores. Normalize `_x5F_` → `_` before matching.
- **Back SVG has 4-level nested `<g>`**. `path.closest("g")` returns the innermost uuid wrapper. Walk up the ancestor chain to find the first `<g id>` with a known prefix.
- **Invisible paths** need `fill: rgba(0,0,0,0.01)` and `pointer-events: all` or they won't be clickable.
- **Front SVG viewBox**: `992.13 × 992.13` (square). **Back SVG viewBox**: `622.13 × 881.02` (portrait) — but the bottom ~31% is empty after `BACK_SVG_TRANSFORM`. The viewBox is cropped to `0 0 622.13 606` in `BackSVG.tsx` after transforms are applied, so the container uses `aspectRatio: "622.13 / 606"`. The transform math still uses the original `881.02` height for center-pivot calculations — see `BACK_ORIGINAL_VB_H` in `BackSVG.tsx`.

### Overlay calibration (`src/lib/overlayCalibration.ts`)

Two independent calibrations:

- `BACK_SVG_TRANSFORM` — positions the Back SVG content (scaleY: 0.635, translateY: -116). Tuned so the SVG drawing aligns with the PNG photograph.
- `BACK_CALIBRATION` — positions the Back PNG overlay (scaleY: 0.715, translateY: -116). Keeps the texture on top of the colored SVG.
- `FRONT_CALIBRATION` — positions the Front PNG overlay (scaleX/Y: 1.03, translateX/Y: ~15/4).

If you change `BACK_CALIBRATION.scaleY`, update `BACK_VISUAL_SCALE` in `InvoiceBagPreview.tsx` to match (`1 / scaleY`).

### Size toggle

`SIZE_SCALE: { "14": 0.875, "16": 1 }`. The outer bag container is a fixed size; an inner `position: absolute, inset: 0` div gets `transform: scale(SIZE_SCALE[size])` with `transformOrigin: center center`. All children (SVG, PNG overlay, dimension guides) scale together automatically.

### Design serialization

`src/lib/invoiceSerialization.ts` — `encodeDesign` / `decodeDesign`. URL-safe base64 (`-`/`_` instead of `+`/`/`, no `=` padding). Carries: colors, size, zipper, embroidery. Used to pass designs through OAuth redirects and share links.

### Responsive layout (Studio page)

`useWindowWidth()` hook drives breakpoints:
- `isMobile` = `vw < 540` — 4-column color grid, 16px page padding, tighter gaps
- `isWide` = `vw >= 880` — bags render side-by-side (both `width: BASE_W = 420px`); on narrower screens each bag is `width: 100%` and they stack

### iOS Safari animation rule

**Never animate CSS `transform` on SVG `<g>` elements** — Safari Mobile doesn't reliably transition them. Instead, wrap the animated part in a `<div>` and animate the div. The gift box lid animation in the Studio prize banner uses this pattern.

## Auth & Voting Flow (Supabase)

### Database tables

- `seasons` — `id, name, is_active`. Only one active season at a time.
- `design_submissions` — `user_id, season_id, design_json, fingerprint, submitted_at`. Unique on `(user_id, season_id)` — one vote per user per season, upsertable.

### RLS policy required

```sql
CREATE POLICY "Users can upsert own submissions"
ON design_submissions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### OAuth flow

1. User clicks "Submit my vote" (or "Vote for this style")
2. If already signed in → `saveVoteDirectly()` upserts to Supabase from browser client
3. If signed out → `SaveDesignModal` opens → "Continue with Google"
4. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback?d=DESIGN&next=/studio' } })`
5. `/auth/callback` exchanges code → saves design → redirects to `${next}?saved=1`
6. Page shows green toast ("Your vote has been saved")

### Middleware

`src/middleware.ts` is a **pure pass-through** — no Supabase session refresh. `@supabase/ssr` imports crash the Next.js edge runtime with `MIDDLEWARE_INVOCATION_FAILED`. Auth is handled entirely in the Node.js `/auth/callback` route.

### Google OAuth setup (Supabase provider)

- Supabase → Authentication → Providers → Google → Client ID + Secret
- Authorized redirect URI in Google Cloud Console: `https://[supabase-ref].supabase.co/auth/v1/callback`

## Invoice / quotation feature

`/invoice?d=…` decodes the design param inside a `Suspense` boundary (required — `useSearchParams` suspends). `InvoiceDocument` is A4, captured via `html2canvas` (scale=2, `useCORS: true`) and wrapped into PDF with `jspdf`. Export uses Web Share API with download fallback.

### Pricing semantics — tax-inclusive

`src/lib/pricing.ts` is the single source of truth. **Base prices (`BASE_PRICES_SZL` etc.) are tax-inclusive amounts quoted to customers.** Pre-tax is derived at render time: `unitPreSZL = unitInclSZL / (1 + taxRate)`.

Currencies: SZL 17% VAT, ZAR 15%, USD 0% (export), TWD 5%. Volume discounts: 10% at 200+, 15% at 500+, 20% at 1000+ pcs. MOQ = 200 (warning only, doesn't block).

FX rates in `CURRENCIES[*].rateFromSZL` are placeholders — `TODO: finalize with finance`.

### Invoice bag preview — back-clip trick

`InvoiceBagPreview.tsx` renders front + back side by side. The back is rendered into an oversized inner div (`width * BACK_VISUAL_SCALE` where `BACK_VISUAL_SCALE = 1 / BACK_CALIBRATION.scaleY ≈ 1.399`), clipped by a square outer container with `overflow: hidden`. `top: 0` (not centered) keeps the bag head visible — centering would crop it. The row uses `alignItems: flex-end` for shared baseline.
