# Salon Catalogue Sub-Page — Design

**Date:** 2026-06-30
**Status:** Approved (brainstorming)

## Summary

A standalone catalogue sub-page at `/salon` where salon clients in Eswatini can
browse goods organised by catalogue (hair / decorations / others), view photos,
descriptions and prices, and find where to buy each category locally (online shop
link and/or Google Maps address). Content is managed through a built-in CMS
(`/salon/admin`) with multi-photo upload, description and price editing.

The sub-page is **decoupled from the main backpack site** (no shared navigation,
no cross-links) but **reuses the existing infrastructure**: Supabase
(DB + Storage + auth), the `src/lib/supabase` clients, `ThemeContext`, the
next-intl i18n machinery, and Tailwind tokens/fonts.

## Goals

- Salon clients browse goods by category with photos, descriptions, prices.
- Each category surfaces "where to buy in Eswatini" — online shop link and/or
  Google Maps address.
- Non-technical content updates via a built-in admin: multi-photo upload,
  description, price, per-category shops.
- Reuse the existing stack; add no new third-party services.

## Non-Goals (YAGNI)

- No cart / checkout / ordering flow.
- No customer accounts (only admin auth).
- No integration with the backpack customizer or its navigation.
- No multi-language UI at launch (English only; i18n scaffolding kept for later
  siSwati support).
- No buy info outside Eswatini.

## Architecture

### Routes

- **`/salon`** — public catalogue (main page). Server-rendered from Supabase
  (published rows only) for speed and SEO.
- **`/salon/admin`** — protected CMS for products and per-category shops.
- **`/salon/login`** — admin sign-in, reusing existing Supabase auth and the
  existing `/auth/callback` route.

### Standalone structure

- Its own lightweight salon header/footer — **not** the backpack
  `SiteHeader` / `SiteFooter`.
- No links between the salon area and the backpack site in either direction.
- Reuses: `src/lib/supabase/{server,client}.ts`, `ThemeContext`, i18n machinery,
  Tailwind tokens and fonts.

## Data Model (Supabase)

### Table: `salon_products`

| field | type | notes |
|---|---|---|
| id | uuid PK | |
| category | text | `hair` \| `decorations` \| `others` (CHECK constraint) |
| name | text | required |
| description | text | |
| price | numeric | required, >= 0 |
| currency | text | default `SZL` (Eswatini Lilangeni) |
| photos | text[] | ordered list of Storage paths; first = cover; >= 1 |
| is_published | bool | default false; hides drafts from public |
| sort_order | int | default 0; manual ordering |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now(); trigger on update |

### Table: `salon_shops` (per-category "where to buy")

| field | type | notes |
|---|---|---|
| id | uuid PK | |
| category | text | which catalogue it serves (same CHECK set) |
| shop_name | text | required |
| online_url | text | nullable — link to online shop |
| map_address | text | nullable — human-readable address |
| google_maps_url | text | nullable — opens Google Maps |
| sort_order | int | default 0 |

A category may have one or several shops. Each shop renders a "Visit online shop"
button (when `online_url` is present) and/or an address with an
"Open in Google Maps" link (when `map_address` / `google_maps_url` present).

### Storage

- Bucket: `salon`, one folder per product (e.g. `salon/<product_id>/<file>`).
- Public read of objects; uploads/deletes restricted to admins.

### Row-Level Security

- Public (anon) read: `salon_products WHERE is_published = true`, and all
  `salon_shops`.
- Writes (insert/update/delete) on both tables and Storage: only authenticated
  users whose email is in the admin allowlist.

## Admin CMS (`/salon/admin`)

- Auth gate: requires an authenticated Supabase user whose email is in an admin
  allowlist (env var, e.g. `SALON_ADMIN_EMAILS`). Non-admins redirected to
  `/salon/login`.
- **Product list:** grouped by category; edit, delete, publish/unpublish toggle.
- **Add/edit product form:**
  - category dropdown, name, description (multiline), price + currency.
  - multi-photo uploader: select multiple images, upload to `salon` bucket, show
    thumbnails, reorder and remove (first = cover).
  - validation: name required, category required, price >= 0, >= 1 photo.
- **Shops manager:** per category, add/edit/remove shops (name, online URL,
  map address, Google Maps URL).

## Public Catalogue (`/salon`)

- Category tabs/filter: Hair · Decorations · Others.
- Product grid: cards with cover photo, name, price (formatted with currency).
- Product detail (modal or sub-route): full photo gallery, description, price,
  and the "Where to buy in Eswatini" block for that product's category.
- Empty states for categories with no published goods; image fallback for
  missing/broken photos.

## Cross-Cutting

- **Language:** English only at launch; built on the existing next-intl machinery
  so siSwati can be added later without rework.
- **Theme:** reuses `ThemeContext` (light/dark).
- **Images:** `next/image` with the Supabase Storage domain whitelisted in
  `next.config`.
- **Currency:** prices stored as numeric + currency code; displayed formatted
  (default SZL).

## Error Handling

- Admin form: inline validation errors; upload failures surface a retryable error
  and do not save a partial product.
- Public page: graceful empty states; image fallbacks; published-only filtering
  enforced at the query and RLS level.

## Testing

- Unit tests: data-access layer (queries return published-only; shop grouping)
  and price/currency formatting.
- Manual verification checklist: admin login gate, product CRUD with multi-photo
  upload/reorder, publish toggle visibility, shops CRUD, public render across all
  three categories, where-to-buy links.

## Open Items / Defaults Chosen

- Currency defaults to SZL; admin can override per product if needed.
- Admin sign-in mechanism reuses whatever the existing Supabase auth flow uses
  (confirm magic-link vs OAuth during implementation planning).
