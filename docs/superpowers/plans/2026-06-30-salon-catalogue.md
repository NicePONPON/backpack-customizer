# Salon Catalogue Sub-Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/salon` catalogue sub-page where Eswatini salon clients browse goods by category (hair/decorations/others) with photos, descriptions and prices, plus per-category "where to buy" info — managed through a built-in Supabase-backed CMS at `/salon/admin`.

**Architecture:** A self-contained `/salon` route tree inside the existing Next.js app. It reuses the existing Supabase clients (`src/lib/supabase`), `ThemeContext`, the Google-OAuth `/auth/callback` flow, and Tailwind tokens, but has its own header/footer and no links to the backpack site. Catalogue data lives in two Postgres tables (`salon_products`, `salon_shops`); photos live in a public Supabase Storage bucket (`salon`). Admin access is gated by a `salon_admins` table that also backs the RLS write policies.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (Postgres + Storage + Auth), Vitest (added in this plan for pure-logic unit tests).

## Global Constraints

- Next.js 16 App Router; React 19; TypeScript; Tailwind CSS v4 (`@tailwindcss/postcss`).
- Path alias: `@/*` → `src/*`.
- Font-size tokens only — `var(--fs-lg)` 32px, `var(--fs-md)` 15px, `var(--fs-sm)` 12px. Never hardcode a raw px font-size in UI components. Letter-spacing: `var(--ls-normal)` 0.04em, `var(--ls-caps)` 0.15em.
- Reuse Supabase clients: `createClient` from `@/lib/supabase/client` (browser) and `@/lib/supabase/server` (server).
- The salon area MUST NOT import `SiteHeader`, `SiteFooter`, or `SubNav`, and MUST NOT link to backpack routes (`/`, `/customize`, `/studio`, `/gallery`, `/shop`, `/invoice`).
- Categories are exactly: `hair`, `decorations`, `others`.
- Default currency: `SZL` (Eswatini Lilangeni).
- English-only copy at launch; all UI strings centralized in `src/app/salon/copy.ts` (the future i18n swap point).
- Auth reuses Google OAuth via `supabase.auth.signInWithOAuth` → `/auth/callback?next=/salon/admin`. Middleware stays a pass-through (do not add `@supabase/ssr` to middleware — it crashes the edge runtime).
- Dev server for verification runs on port 3001: `npm run dev -- -p 3001` (port 3000 is reserved for the ERP project).
- Lint must pass: `npm run lint`. Build must pass: `npm run build`.
- Deploy is `git push origin main` (Vercel project `backpack-customizer-v2` watches `main`). Do not push without explicit user approval.

---

## File Structure

**Create:**
- `supabase/salon-schema.sql` — tables, RLS, bucket policies (run manually in Supabase SQL editor)
- `vitest.config.ts` — Vitest config
- `src/lib/salon/types.ts` — `SalonCategory`, `SalonProduct`, `SalonShop`, `SalonProductInput`, `SalonShopInput`
- `src/lib/salon/format.ts` — `formatPrice(price, currency)`
- `src/lib/salon/storage.ts` — `photoPublicUrl(path)`, `productPhotoPath(productId, fileName)`
- `src/lib/salon/shops.ts` — `groupShopsByCategory(rows)`
- `src/lib/salon/queries.ts` — `getPublishedProducts()`, `getAllShops()`, `getAllProducts()` (server)
- `src/lib/salon/admin.ts` — `getCurrentAdminEmail()` (server gate helper)
- `src/lib/salon/__tests__/format.test.ts`
- `src/lib/salon/__tests__/storage.test.ts`
- `src/lib/salon/__tests__/shops.test.ts`
- `src/app/salon/copy.ts` — centralized English UI strings
- `src/app/salon/layout.tsx` — salon-scoped layout (header/footer/metadata)
- `src/app/salon/page.tsx` — public catalogue (server component)
- `src/app/salon/SalonCatalogue.tsx` — client: tabs, grid, detail modal orchestration
- `src/app/salon/login/page.tsx` — admin login (client)
- `src/app/salon/admin/page.tsx` — admin gate (server component)
- `src/app/salon/admin/AdminDashboard.tsx` — client: product list + form + shops manager
- `src/components/salon/SalonHeader.tsx`
- `src/components/salon/SalonFooter.tsx`
- `src/components/salon/ProductCard.tsx`
- `src/components/salon/ProductDetailModal.tsx`
- `src/components/salon/WhereToBuy.tsx`
- `src/components/salon/PhotoUploader.tsx`

**Modify:**
- `package.json` — add Vitest devDeps + `test` script
- `next.config.ts` — whitelist Supabase Storage host for `next/image`

---

## Task 1: Database schema, storage bucket, RLS

**Files:**
- Create: `supabase/salon-schema.sql`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: Postgres tables `salon_products`, `salon_shops`, `salon_admins`; public Storage bucket `salon`; RLS policies. Column names exactly as below — later tasks depend on them.

- [ ] **Step 1: Write the schema SQL file**

Create `supabase/salon-schema.sql`:

```sql
-- ============ Salon catalogue schema ============

create table if not exists salon_admins (
  email text primary key
);

create table if not exists salon_products (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hair','decorations','others')),
  name text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  currency text not null default 'SZL',
  photos text[] not null default '{}',
  is_published boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists salon_shops (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('hair','decorations','others')),
  shop_name text not null,
  online_url text,
  map_address text,
  google_maps_url text,
  sort_order int not null default 0
);

-- keep updated_at fresh
create or replace function salon_touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists salon_products_touch on salon_products;
create trigger salon_products_touch before update on salon_products
for each row execute function salon_touch_updated_at();

-- ============ RLS ============
alter table salon_products enable row level security;
alter table salon_shops enable row level security;
alter table salon_admins enable row level security;

-- helper: is the current user an admin?
create or replace function salon_is_admin() returns boolean as $$
  select exists (
    select 1 from salon_admins a
    where a.email = (auth.jwt() ->> 'email')
  );
$$ language sql security definer stable;

-- public read of published products; admins read all
drop policy if exists "salon products public read" on salon_products;
create policy "salon products public read" on salon_products
for select to anon, authenticated
using (is_published = true or salon_is_admin());

-- admins write products
drop policy if exists "salon products admin write" on salon_products;
create policy "salon products admin write" on salon_products
for all to authenticated
using (salon_is_admin()) with check (salon_is_admin());

-- public read of all shops
drop policy if exists "salon shops public read" on salon_shops;
create policy "salon shops public read" on salon_shops
for select to anon, authenticated using (true);

-- admins write shops
drop policy if exists "salon shops admin write" on salon_shops;
create policy "salon shops admin write" on salon_shops
for all to authenticated
using (salon_is_admin()) with check (salon_is_admin());

-- admins can read the admin list (to self-check); no public read
drop policy if exists "salon admins self read" on salon_admins;
create policy "salon admins self read" on salon_admins
for select to authenticated
using (email = (auth.jwt() ->> 'email'));

-- ============ Storage bucket ============
insert into storage.buckets (id, name, public)
values ('salon', 'salon', true)
on conflict (id) do nothing;

-- public read of salon objects
drop policy if exists "salon storage public read" on storage.objects;
create policy "salon storage public read" on storage.objects
for select to anon, authenticated
using (bucket_id = 'salon');

-- admins write salon objects
drop policy if exists "salon storage admin write" on storage.objects;
create policy "salon storage admin write" on storage.objects
for all to authenticated
using (bucket_id = 'salon' and salon_is_admin())
with check (bucket_id = 'salon' and salon_is_admin());

-- ============ Seed first admin (EDIT THIS EMAIL) ============
insert into salon_admins (email) values ('chrisliao1990@gmail.com')
on conflict (email) do nothing;
```

- [ ] **Step 2: Run the schema in Supabase**

Open the Supabase project → SQL Editor → paste the contents of `supabase/salon-schema.sql` → Run.
Expected: "Success. No rows returned." Verify in Table Editor that `salon_products`, `salon_shops`, `salon_admins` exist and Storage shows a public `salon` bucket.

- [ ] **Step 3: Whitelist Supabase Storage host for next/image**

Modify `next.config.ts` — add `images.remotePatterns` (keep the existing `redirects`):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "d" }],
        destination: "/customize",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verify build still passes**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/salon-schema.sql next.config.ts
git commit -m "feat(salon): database schema, storage bucket, RLS, image host"
```

---

## Task 2: Pure-logic modules + Vitest (TDD)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `src/lib/salon/types.ts`, `src/lib/salon/format.ts`, `src/lib/salon/storage.ts`, `src/lib/salon/shops.ts`
- Test: `src/lib/salon/__tests__/format.test.ts`, `storage.test.ts`, `shops.test.ts`

**Interfaces:**
- Produces:
  - `type SalonCategory = "hair" | "decorations" | "others"`
  - `SALON_CATEGORIES: SalonCategory[]`
  - `interface SalonProduct { id: string; category: SalonCategory; name: string; description: string; price: number; currency: string; photos: string[]; is_published: boolean; sort_order: number; }`
  - `interface SalonShop { id: string; category: SalonCategory; shop_name: string; online_url: string | null; map_address: string | null; google_maps_url: string | null; sort_order: number; }`
  - `type SalonProductInput = Omit<SalonProduct, "id">`
  - `type SalonShopInput = Omit<SalonShop, "id">`
  - `formatPrice(price: number, currency: string): string`
  - `photoPublicUrl(path: string): string`
  - `productPhotoPath(productId: string, fileName: string): string`
  - `groupShopsByCategory(rows: SalonShop[]): Record<SalonCategory, SalonShop[]>`

- [ ] **Step 1: Add Vitest dependency and script**

Run: `npm install -D vitest`
Then modify `package.json` `scripts` to add:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [ ] **Step 3: Create the types module**

Create `src/lib/salon/types.ts`:

```ts
export type SalonCategory = "hair" | "decorations" | "others";

export const SALON_CATEGORIES: SalonCategory[] = ["hair", "decorations", "others"];

export interface SalonProduct {
  id: string;
  category: SalonCategory;
  name: string;
  description: string;
  price: number;
  currency: string;
  photos: string[];
  is_published: boolean;
  sort_order: number;
}

export interface SalonShop {
  id: string;
  category: SalonCategory;
  shop_name: string;
  online_url: string | null;
  map_address: string | null;
  google_maps_url: string | null;
  sort_order: number;
}

export type SalonProductInput = Omit<SalonProduct, "id">;
export type SalonShopInput = Omit<SalonShop, "id">;
```

- [ ] **Step 4: Write failing test for formatPrice**

Create `src/lib/salon/__tests__/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/salon/format";

describe("formatPrice", () => {
  it("formats SZL with the currency code and two decimals", () => {
    expect(formatPrice(1200, "SZL")).toBe("SZL 1,200.00");
  });

  it("formats zero", () => {
    expect(formatPrice(0, "SZL")).toBe("SZL 0.00");
  });

  it("respects a different currency code", () => {
    expect(formatPrice(99.5, "USD")).toBe("USD 99.50");
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- format`
Expected: FAIL — cannot find module `@/lib/salon/format`.

- [ ] **Step 6: Implement formatPrice**

Create `src/lib/salon/format.ts`:

```ts
// Currency-code prefix + grouped, 2-decimal amount. We prepend the code
// (rather than Intl currency style) because SZL has no stable locale symbol.
export function formatPrice(price: number, currency: string): string {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${currency} ${amount}`;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- format`
Expected: PASS (3 tests).

- [ ] **Step 8: Write failing test for storage helpers**

Create `src/lib/salon/__tests__/storage.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { photoPublicUrl, productPhotoPath } from "@/lib/salon/storage";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
});

describe("photoPublicUrl", () => {
  it("builds a public storage URL for a path", () => {
    expect(photoPublicUrl("p1/photo.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/salon/p1/photo.jpg"
    );
  });
});

describe("productPhotoPath", () => {
  it("namespaces the file under the product id and strips unsafe chars", () => {
    const path = productPhotoPath("p1", "My Photo (1).JPG");
    expect(path.startsWith("p1/")).toBe(true);
    expect(path).toMatch(/^p1\/[0-9]+-my-photo-1\.jpg$/);
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npm test -- storage`
Expected: FAIL — cannot find module `@/lib/salon/storage`.

- [ ] **Step 10: Implement storage helpers**

Create `src/lib/salon/storage.ts`:

```ts
const BUCKET = "salon";

export function photoPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

// Deterministic-ish unique path: <productId>/<timestamp>-<slug>.<ext>
export function productPhotoPath(productId: string, fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = (dot >= 0 ? fileName.slice(dot + 1) : "jpg").toLowerCase();
  const stem = (dot >= 0 ? fileName.slice(0, dot) : fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${productId}/${Date.now()}-${stem}.${ext}`;
}
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npm test -- storage`
Expected: PASS (2 tests).

- [ ] **Step 12: Write failing test for groupShopsByCategory**

Create `src/lib/salon/__tests__/shops.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupShopsByCategory } from "@/lib/salon/shops";
import type { SalonShop } from "@/lib/salon/types";

const shop = (over: Partial<SalonShop>): SalonShop => ({
  id: "x", category: "hair", shop_name: "S", online_url: null,
  map_address: null, google_maps_url: null, sort_order: 0, ...over,
});

describe("groupShopsByCategory", () => {
  it("buckets shops by category", () => {
    const rows = [
      shop({ id: "1", category: "hair" }),
      shop({ id: "2", category: "others" }),
      shop({ id: "3", category: "hair" }),
    ];
    const grouped = groupShopsByCategory(rows);
    expect(grouped.hair.map((s) => s.id)).toEqual(["1", "3"]);
    expect(grouped.others.map((s) => s.id)).toEqual(["2"]);
    expect(grouped.decorations).toEqual([]);
  });
});
```

- [ ] **Step 13: Run test to verify it fails**

Run: `npm test -- shops`
Expected: FAIL — cannot find module `@/lib/salon/shops`.

- [ ] **Step 14: Implement groupShopsByCategory**

Create `src/lib/salon/shops.ts`:

```ts
import { SALON_CATEGORIES, type SalonCategory, type SalonShop } from "@/lib/salon/types";

export function groupShopsByCategory(rows: SalonShop[]): Record<SalonCategory, SalonShop[]> {
  const grouped = Object.fromEntries(
    SALON_CATEGORIES.map((c) => [c, [] as SalonShop[]])
  ) as Record<SalonCategory, SalonShop[]>;
  for (const row of rows) grouped[row.category]?.push(row);
  return grouped;
}
```

- [ ] **Step 15: Run all tests + lint**

Run: `npm test && npm run lint`
Expected: all tests PASS; lint clean.

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/salon
git commit -m "feat(salon): types, pure helpers, vitest setup"
```

---

## Task 3: Server data layer + admin gate helper

**Files:**
- Create: `src/lib/salon/queries.ts`, `src/lib/salon/admin.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; types from `@/lib/salon/types`.
- Produces:
  - `getPublishedProducts(): Promise<SalonProduct[]>`
  - `getAllProducts(): Promise<SalonProduct[]>`
  - `getAllShops(): Promise<SalonShop[]>`
  - `getCurrentAdminEmail(): Promise<string | null>` — returns the signed-in user's email if they are in `salon_admins`, else null.

- [ ] **Step 1: Implement the query module**

Create `src/lib/salon/queries.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import type { SalonProduct, SalonShop } from "@/lib/salon/types";

export async function getPublishedProducts(): Promise<SalonProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salon_products")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalonProduct[];
}

export async function getAllProducts(): Promise<SalonProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salon_products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalonProduct[];
}

export async function getAllShops(): Promise<SalonShop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salon_shops")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalonShop[];
}
```

- [ ] **Step 2: Implement the admin gate helper**

Create `src/lib/salon/admin.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

// Returns the signed-in user's email iff they are listed in salon_admins.
// Relies on the salon_admins RLS "self read" policy: a non-admin gets 0 rows.
export async function getCurrentAdminEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("salon_admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (error || !data) return null;
  return data.email as string;
}
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: build + lint succeed (these modules are imported by later tasks; build confirms they typecheck).

- [ ] **Step 4: Commit**

```bash
git add src/lib/salon/queries.ts src/lib/salon/admin.ts
git commit -m "feat(salon): server data layer and admin gate helper"
```

---

## Task 4: Salon layout, header, footer, copy, shell page

**Files:**
- Create: `src/app/salon/copy.ts`, `src/app/salon/layout.tsx`, `src/components/salon/SalonHeader.tsx`, `src/components/salon/SalonFooter.tsx`, `src/app/salon/page.tsx` (shell version)

**Interfaces:**
- Produces: `SALON_COPY` (default export object of UI strings); `SalonHeader`, `SalonFooter` components; a `/salon` route rendering the shell. Later tasks replace the body of `page.tsx`.

- [ ] **Step 1: Create the copy module**

Create `src/app/salon/copy.ts`:

```ts
// Central English copy for the salon sub-site. Future i18n swaps happen here.
export const SALON_COPY = {
  brand: "Salon Catalogue",
  tagline: "Salon supplies in Eswatini",
  categories: {
    hair: "Hair",
    decorations: "Decorations",
    others: "Others",
  },
  emptyCategory: "No items in this category yet. Check back soon.",
  whereToBuyTitle: "Where to buy in Eswatini",
  visitShop: "Visit online shop",
  openInMaps: "Open in Google Maps",
  detailClose: "Close",
  footerNote: "© Anpeng Trading — Salon Catalogue",
  admin: {
    title: "Salon Admin",
    loginPrompt: "Sign in to manage the salon catalogue.",
    continueWithGoogle: "Continue with Google",
    signOut: "Sign out",
    notAuthorized: "This account is not an authorized salon admin.",
    products: "Products",
    shops: "Where to buy",
    addProduct: "Add product",
    addShop: "Add shop",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    publish: "Publish",
    unpublish: "Unpublish",
    published: "Published",
    draft: "Draft",
    fieldName: "Name",
    fieldCategory: "Category",
    fieldDescription: "Description",
    fieldPrice: "Price",
    fieldCurrency: "Currency",
    fieldPhotos: "Photos",
    uploadPhotos: "Upload photos",
    coverHint: "First photo is the cover.",
    shopName: "Shop name",
    onlineUrl: "Online shop URL",
    mapAddress: "Address",
    googleMapsUrl: "Google Maps URL",
  },
} as const;

export default SALON_COPY;
```

- [ ] **Step 2: Create the header**

Create `src/components/salon/SalonHeader.tsx`:

```tsx
import SALON_COPY from "@/app/salon/copy";

export default function SalonHeader() {
  return (
    <header
      style={{
        borderBottom: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
        padding: "20px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)", fontWeight: 600 }}>
        {SALON_COPY.brand}
      </div>
      <div
        style={{
          fontSize: "var(--fs-sm)",
          letterSpacing: "var(--ls-caps)",
          textTransform: "uppercase",
          opacity: 0.6,
          marginTop: 4,
        }}
      >
        {SALON_COPY.tagline}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create the footer**

Create `src/components/salon/SalonFooter.tsx`:

```tsx
import SALON_COPY from "@/app/salon/copy";

export default function SalonFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
        padding: "24px",
        textAlign: "center",
        fontSize: "var(--fs-sm)",
        letterSpacing: "var(--ls-caps)",
        textTransform: "uppercase",
        opacity: 0.6,
        marginTop: "auto",
      }}
    >
      {SALON_COPY.footerNote}
    </footer>
  );
}
```

- [ ] **Step 4: Create the salon layout**

Create `src/app/salon/layout.tsx`:

```tsx
import type { Metadata } from "next";
import SalonHeader from "@/components/salon/SalonHeader";
import SalonFooter from "@/components/salon/SalonFooter";

export const metadata: Metadata = {
  title: "Salon Catalogue",
  description: "Browse salon supplies and find where to buy in Eswatini.",
};

export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
      <SalonHeader />
      <main style={{ flex: 1, width: "100%", maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
      <SalonFooter />
    </div>
  );
}
```

- [ ] **Step 5: Create the shell page**

Create `src/app/salon/page.tsx`:

```tsx
export default function SalonPage() {
  return (
    <div style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)" }}>
      Salon catalogue coming online.
    </div>
  );
}
```

- [ ] **Step 6: Verify it renders**

Run: `npm run dev -- -p 3001` then open `http://localhost:3001/salon`.
Expected: header ("Salon Catalogue" + tagline), the placeholder line, and footer. No backpack nav present. Stop the dev server.

- [ ] **Step 7: Build + lint**

Run: `npm run build && npm run lint`
Expected: success.

- [ ] **Step 8: Commit**

```bash
git add src/app/salon/copy.ts src/app/salon/layout.tsx src/app/salon/page.tsx src/components/salon/SalonHeader.tsx src/components/salon/SalonFooter.tsx
git commit -m "feat(salon): standalone layout, header, footer, copy, shell page"
```

---

## Task 5: Public catalogue — category tabs + product grid

**Files:**
- Create: `src/components/salon/ProductCard.tsx`, `src/app/salon/SalonCatalogue.tsx`
- Modify: `src/app/salon/page.tsx`

**Interfaces:**
- Consumes: `getPublishedProducts`, `getAllShops` (Task 3); `groupShopsByCategory` (Task 2); types; `SALON_COPY`.
- Produces:
  - `ProductCard({ product, onOpen }: { product: SalonProduct; onOpen: (p: SalonProduct) => void })`
  - `SalonCatalogue({ products, shopsByCategory }: { products: SalonProduct[]; shopsByCategory: Record<SalonCategory, SalonShop[]> })`

- [ ] **Step 1: Create ProductCard**

Create `src/components/salon/ProductCard.tsx`:

```tsx
"use client";

import Image from "next/image";
import { photoPublicUrl } from "@/lib/salon/storage";
import { formatPrice } from "@/lib/salon/format";
import type { SalonProduct } from "@/lib/salon/types";

export default function ProductCard({
  product,
  onOpen,
}: {
  product: SalonProduct;
  onOpen: (p: SalonProduct) => void;
}) {
  const cover = product.photos[0];
  return (
    <button
      onClick={() => onOpen(product)}
      style={{
        textAlign: "left",
        border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
        borderRadius: 12,
        overflow: "hidden",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        color: "inherit",
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}>
        {cover ? (
          <Image
            src={photoPublicUrl(cover)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 280px"
            style={{ objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)" }}>{product.name}</div>
        <div style={{ fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-normal)", opacity: 0.7, marginTop: 4 }}>
          {formatPrice(product.price, product.currency)}
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create SalonCatalogue (tabs + grid; detail modal added in Task 6)**

Create `src/app/salon/SalonCatalogue.tsx`:

```tsx
"use client";

import { useState } from "react";
import ProductCard from "@/components/salon/ProductCard";
import SALON_COPY from "@/app/salon/copy";
import { SALON_CATEGORIES, type SalonCategory, type SalonProduct, type SalonShop } from "@/lib/salon/types";

export default function SalonCatalogue({
  products,
  shopsByCategory,
}: {
  products: SalonProduct[];
  shopsByCategory: Record<SalonCategory, SalonShop[]>;
}) {
  const [active, setActive] = useState<SalonCategory>("hair");
  // shopsByCategory is consumed by the detail modal added in Task 6.
  void shopsByCategory;

  const visible = products.filter((p) => p.category === active);

  return (
    <div>
      <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {SALON_CATEGORIES.map((c) => {
          const on = c === active;
          return (
            <button
              key={c}
              onClick={() => setActive(c)}
              style={{
                fontSize: "var(--fs-sm)",
                letterSpacing: "var(--ls-caps)",
                textTransform: "uppercase",
                padding: "8px 16px",
                borderRadius: 999,
                cursor: "pointer",
                border: "1px solid color-mix(in srgb, var(--foreground) 20%, transparent)",
                background: on ? "var(--foreground)" : "transparent",
                color: on ? "var(--background)" : "inherit",
              }}
            >
              {SALON_COPY.categories[c]}
            </button>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <p style={{ fontSize: "var(--fs-md)", opacity: 0.6 }}>{SALON_COPY.emptyCategory}</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire the server page to real data**

Replace the contents of `src/app/salon/page.tsx`:

```tsx
import SalonCatalogue from "@/app/salon/SalonCatalogue";
import { getPublishedProducts, getAllShops } from "@/lib/salon/queries";
import { groupShopsByCategory } from "@/lib/salon/shops";

export const dynamic = "force-dynamic";

export default async function SalonPage() {
  const [products, shops] = await Promise.all([getPublishedProducts(), getAllShops()]);
  const shopsByCategory = groupShopsByCategory(shops);
  return <SalonCatalogue products={products} shopsByCategory={shopsByCategory} />;
}
```

- [ ] **Step 4: Verify with seed data**

In Supabase SQL editor, insert one published product:

```sql
insert into salon_products (category, name, description, price, is_published)
values ('hair', 'Test Shampoo', 'A test item.', 199.00, true);
```

Run: `npm run dev -- -p 3001`, open `http://localhost:3001/salon`.
Expected: Hair tab shows the "Test Shampoo" card with price `SZL 199.00`; Decorations/Others show the empty message. Stop the server.

- [ ] **Step 5: Build + lint**

Run: `npm run build && npm run lint`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/app/salon/page.tsx src/app/salon/SalonCatalogue.tsx src/components/salon/ProductCard.tsx
git commit -m "feat(salon): public catalogue with category tabs and product grid"
```

---

## Task 6: Product detail modal + where-to-buy

**Files:**
- Create: `src/components/salon/WhereToBuy.tsx`, `src/components/salon/ProductDetailModal.tsx`
- Modify: `src/app/salon/SalonCatalogue.tsx`

**Interfaces:**
- Consumes: `photoPublicUrl`, `formatPrice`, types, `SALON_COPY`.
- Produces:
  - `WhereToBuy({ shops }: { shops: SalonShop[] })`
  - `ProductDetailModal({ product, shops, onClose }: { product: SalonProduct; shops: SalonShop[]; onClose: () => void })`

- [ ] **Step 1: Create WhereToBuy**

Create `src/components/salon/WhereToBuy.tsx`:

```tsx
import SALON_COPY from "@/app/salon/copy";
import type { SalonShop } from "@/lib/salon/types";

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "var(--fs-sm)",
  letterSpacing: "var(--ls-caps)",
  textTransform: "uppercase",
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)",
  textDecoration: "none",
  color: "inherit",
  marginRight: 8,
  marginTop: 8,
};

export default function WhereToBuy({ shops }: { shops: SalonShop[] }) {
  if (shops.length === 0) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)", fontWeight: 600 }}>
        {SALON_COPY.whereToBuyTitle}
      </h3>
      {shops.map((s) => (
        <div key={s.id} style={{ marginTop: 12 }}>
          <div style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)" }}>{s.shop_name}</div>
          {s.map_address ? (
            <div style={{ fontSize: "var(--fs-sm)", opacity: 0.7, marginTop: 2 }}>{s.map_address}</div>
          ) : null}
          <div>
            {s.online_url ? (
              <a href={s.online_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {SALON_COPY.visitShop}
              </a>
            ) : null}
            {s.google_maps_url ? (
              <a href={s.google_maps_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {SALON_COPY.openInMaps}
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Create ProductDetailModal**

Create `src/components/salon/ProductDetailModal.tsx`:

```tsx
"use client";

import Image from "next/image";
import { photoPublicUrl } from "@/lib/salon/storage";
import { formatPrice } from "@/lib/salon/format";
import SALON_COPY from "@/app/salon/copy";
import WhereToBuy from "@/components/salon/WhereToBuy";
import type { SalonProduct, SalonShop } from "@/lib/salon/types";

export default function ProductDetailModal({
  product,
  shops,
  onClose,
}: {
  product: SalonProduct;
  shops: SalonShop[];
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--background)", color: "var(--foreground)", borderRadius: 16, maxWidth: 760, width: "100%", padding: 24, marginTop: 40 }}
      >
        <button
          onClick={onClose}
          style={{ float: "right", fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
        >
          {SALON_COPY.detailClose}
        </button>

        <h2 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{product.name}</h2>
        <div style={{ fontSize: "var(--fs-md)", opacity: 0.8, marginTop: 4 }}>
          {formatPrice(product.price, product.currency)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
          {product.photos.map((path) => (
            <div key={path} style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden", background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}>
              <Image src={photoPublicUrl(path)} alt={product.name} fill sizes="200px" style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>

        {product.description ? (
          <p style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)", marginTop: 16, whiteSpace: "pre-wrap" }}>
            {product.description}
          </p>
        ) : null}

        <WhereToBuy shops={shops} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the modal into SalonCatalogue**

Edit `src/app/salon/SalonCatalogue.tsx`. Add the import at the top (with the other imports):

```tsx
import ProductDetailModal from "@/components/salon/ProductDetailModal";
```

Replace the line `const [active, setActive] = useState<SalonCategory>("hair");` and the `void shopsByCategory;` line with:

```tsx
  const [active, setActive] = useState<SalonCategory>("hair");
  const [selected, setSelected] = useState<SalonProduct | null>(null);
```

Replace `<ProductCard key={p.id} product={p} onOpen={() => {}} />` with:

```tsx
            <ProductCard key={p.id} product={p} onOpen={setSelected} />
```

Add the modal just before the final closing `</div>` of the component's return:

```tsx
      {selected ? (
        <ProductDetailModal
          product={selected}
          shops={shopsByCategory[selected.category]}
          onClose={() => setSelected(null)}
        />
      ) : null}
```

- [ ] **Step 4: Verify**

Add a shop in Supabase SQL editor:

```sql
insert into salon_shops (category, shop_name, map_address, google_maps_url)
values ('hair', 'Mbabane Beauty Supply', 'Gwamile St, Mbabane', 'https://maps.google.com/?q=Mbabane');
```

Run: `npm run dev -- -p 3001`, open `/salon`, Hair tab, click the card.
Expected: modal opens with photos (if any), price, description, and a "Where to buy" block listing the shop with an "Open in Google Maps" link. Clicking the backdrop or Close dismisses it. Stop the server.

- [ ] **Step 5: Build + lint**

Run: `npm run build && npm run lint`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/components/salon/WhereToBuy.tsx src/components/salon/ProductDetailModal.tsx src/app/salon/SalonCatalogue.tsx
git commit -m "feat(salon): product detail modal with where-to-buy"
```

---

## Task 7: Admin login + auth/allowlist gate

**Files:**
- Create: `src/app/salon/login/page.tsx`, `src/app/salon/admin/page.tsx`, `src/app/salon/admin/AdminDashboard.tsx` (gate-only stub; CRUD added in Tasks 8–9)

**Interfaces:**
- Consumes: `getCurrentAdminEmail` (Task 3); `createClient` browser; `SALON_COPY`.
- Produces: `AdminDashboard({ adminEmail, products, shops }: { adminEmail: string; products: SalonProduct[]; shops: SalonShop[] })` — full prop shape used by Tasks 8–9.

- [ ] **Step 1: Create the login page**

Create `src/app/salon/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SALON_COPY from "@/app/salon/copy";

export default function SalonLoginPage() {
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/salon/admin")}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError("Sign-in failed. Please try again.");
  };

  return (
    <div style={{ maxWidth: 360, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{SALON_COPY.admin.title}</h1>
      <p style={{ fontSize: "var(--fs-md)", opacity: 0.7, marginTop: 8 }}>{SALON_COPY.admin.loginPrompt}</p>
      <button
        onClick={handleLogin}
        style={{ marginTop: 20, fontSize: "var(--fs-md)", padding: "12px 20px", borderRadius: 999, cursor: "pointer", border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", background: "var(--foreground)", color: "var(--background)" }}
      >
        {SALON_COPY.admin.continueWithGoogle}
      </button>
      {error ? <p style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 12 }}>{error}</p> : null}
    </div>
  );
}
```

- [ ] **Step 2: Create the admin gate page**

Create `src/app/salon/admin/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getCurrentAdminEmail } from "@/lib/salon/admin";
import { getAllProducts, getAllShops } from "@/lib/salon/queries";
import AdminDashboard from "@/app/salon/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function SalonAdminPage() {
  const adminEmail = await getCurrentAdminEmail();
  if (!adminEmail) redirect("/salon/login");

  const [products, shops] = await Promise.all([getAllProducts(), getAllShops()]);
  return <AdminDashboard adminEmail={adminEmail} products={products} shops={shops} />;
}
```

- [ ] **Step 3: Create the AdminDashboard gate stub**

Create `src/app/salon/admin/AdminDashboard.tsx`:

```tsx
"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import SALON_COPY from "@/app/salon/copy";
import type { SalonProduct, SalonShop } from "@/lib/salon/types";

export default function AdminDashboard({
  adminEmail,
  products,
  shops,
}: {
  adminEmail: string;
  products: SalonProduct[];
  shops: SalonShop[];
}) {
  const router = useRouter();
  // products/shops are rendered by Tasks 8-9.
  void products;
  void shops;

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/salon/login");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{SALON_COPY.admin.title}</h1>
        <button
          onClick={signOut}
          style={{ fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", background: "transparent", border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", borderRadius: 999, padding: "8px 14px", cursor: "pointer", color: "inherit" }}
        >
          {SALON_COPY.admin.signOut}
        </button>
      </div>
      <p style={{ fontSize: "var(--fs-sm)", opacity: 0.6, marginTop: 4 }}>{adminEmail}</p>
    </div>
  );
}
```

- [ ] **Step 4: Verify the gate**

Run: `npm run dev -- -p 3001`.
- Visit `/salon/admin` while signed out → expect redirect to `/salon/login`.
- Click "Continue with Google", sign in with the seeded admin email → expect to land on `/salon/admin?saved=1` showing the title, your email, and Sign out.
- Sign out → expect redirect to `/salon/login`; revisiting `/salon/admin` redirects to login again.
- (Optional) Sign in with a non-admin Google account → expect redirect back to `/salon/login` (not in `salon_admins`).
Stop the server.

> Note: Google OAuth must be enabled in the Supabase project (already configured for the studio voting flow). No new provider setup needed.

- [ ] **Step 5: Build + lint**

Run: `npm run build && npm run lint`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/app/salon/login/page.tsx src/app/salon/admin/page.tsx src/app/salon/admin/AdminDashboard.tsx
git commit -m "feat(salon): admin login and auth/allowlist gate"
```

---

## Task 8: Admin product CRUD + multi-photo uploader

**Files:**
- Create: `src/components/salon/PhotoUploader.tsx`
- Modify: `src/app/salon/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `createClient` browser; `productPhotoPath`, `photoPublicUrl`; `formatPrice`; types; `SALON_COPY`.
- Produces:
  - `PhotoUploader({ productId, photos, onChange }: { productId: string; photos: string[]; onChange: (paths: string[]) => void })` — uploads to bucket `salon`, returns ordered storage paths.

- [ ] **Step 1: Create PhotoUploader**

Create `src/components/salon/PhotoUploader.tsx`:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { productPhotoPath, photoPublicUrl } from "@/lib/salon/storage";
import SALON_COPY from "@/app/salon/copy";

export default function PhotoUploader({
  productId,
  photos,
  onChange,
}: {
  productId: string;
  photos: string[];
  onChange: (paths: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const path = productPhotoPath(productId, file.name);
        const { error: upErr } = await supabase.storage.from("salon").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);
        uploaded.push(path);
      }
      onChange([...photos, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => onChange(photos.filter((_, k) => k !== i));

  return (
    <div>
      <label style={{ fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", opacity: 0.7 }}>
        {SALON_COPY.admin.fieldPhotos}
      </label>
      <div style={{ fontSize: "var(--fs-sm)", opacity: 0.6 }}>{SALON_COPY.admin.coverHint}</div>
      <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => handleFiles(e.target.files)} style={{ display: "block", marginTop: 8, fontSize: "var(--fs-sm)" }} />
      {busy ? <div style={{ fontSize: "var(--fs-sm)", marginTop: 6 }}>Uploading…</div> : null}
      {error ? <div style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 6 }}>{error}</div> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {photos.map((path, i) => (
          <div key={path} style={{ width: 96 }}>
            <div style={{ position: "relative", width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: i === 0 ? "2px solid var(--foreground)" : "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)" }}>
              <Image src={photoPublicUrl(path)} alt="" fill sizes="96px" style={{ objectFit: "cover" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "var(--fs-sm)" }}>
              <button type="button" onClick={() => move(i, -1)} style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}>←</button>
              <button type="button" onClick={() => remove(i)} style={{ cursor: "pointer", background: "none", border: "none", color: "#c0392b" }}>✕</button>
              <button type="button" onClick={() => move(i, 1)} style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}>→</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite AdminDashboard with product CRUD**

Replace the full contents of `src/app/salon/admin/AdminDashboard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PhotoUploader from "@/components/salon/PhotoUploader";
import { formatPrice } from "@/lib/salon/format";
import SALON_COPY from "@/app/salon/copy";
import { SALON_CATEGORIES, type SalonCategory, type SalonProduct, type SalonShop } from "@/lib/salon/types";

type Draft = {
  id: string | null;
  category: SalonCategory;
  name: string;
  description: string;
  price: string;
  currency: string;
  photos: string[];
  is_published: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  category: "hair",
  name: "",
  description: "",
  price: "",
  currency: "SZL",
  photos: [],
  is_published: false,
});

// Client-side id used for namespacing uploads of brand-new products before insert.
function tempId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `tmp-${Date.now()}`);
}

export default function AdminDashboard({
  adminEmail,
  products,
  shops,
}: {
  adminEmail: string;
  products: SalonProduct[];
  shops: SalonShop[];
}) {
  const router = useRouter();
  const supabase = createClient();
  void shops; // shops manager added in Task 9
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftId, setDraftId] = useState<string>(tempId());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/salon/login");
  };

  const startAdd = () => {
    setDraft(emptyDraft());
    setDraftId(tempId());
    setError("");
  };

  const startEdit = (p: SalonProduct) => {
    setDraft({
      id: p.id,
      category: p.category,
      name: p.name,
      description: p.description,
      price: String(p.price),
      currency: p.currency,
      photos: p.photos,
      is_published: p.is_published,
    });
    setDraftId(p.id);
    setError("");
  };

  const save = async () => {
    if (!draft) return;
    const priceNum = Number(draft.price);
    if (!draft.name.trim()) return setError("Name is required.");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("Price must be 0 or more.");
    if (draft.photos.length === 0) return setError("At least one photo is required.");

    setSaving(true);
    setError("");
    const row = {
      category: draft.category,
      name: draft.name.trim(),
      description: draft.description,
      price: priceNum,
      currency: draft.currency,
      photos: draft.photos,
      is_published: draft.is_published,
    };
    const res = draft.id
      ? await supabase.from("salon_products").update(row).eq("id", draft.id)
      : await supabase.from("salon_products").insert(row);
    setSaving(false);
    if (res.error) return setError(res.error.message);
    setDraft(null);
    router.refresh();
  };

  const togglePublish = async (p: SalonProduct) => {
    const { error } = await supabase.from("salon_products").update({ is_published: !p.is_published }).eq("id", p.id);
    if (!error) router.refresh();
  };

  const remove = async (p: SalonProduct) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("salon_products").delete().eq("id", p.id);
    if (!error) router.refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{SALON_COPY.admin.title}</h1>
        <button onClick={signOut} style={pill}>{SALON_COPY.admin.signOut}</button>
      </div>
      <p style={{ fontSize: "var(--fs-sm)", opacity: 0.6, marginTop: 4 }}>{adminEmail}</p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 600, letterSpacing: "var(--ls-caps)", textTransform: "uppercase" }}>{SALON_COPY.admin.products}</h2>
        <button onClick={startAdd} style={pillSolid}>{SALON_COPY.admin.addProduct}</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((p) => (
          <div key={p.id} style={rowStyle}>
            <div>
              <div style={{ fontSize: "var(--fs-md)" }}>{p.name}</div>
              <div style={{ fontSize: "var(--fs-sm)", opacity: 0.6 }}>
                {SALON_COPY.categories[p.category]} · {formatPrice(p.price, p.currency)} · {p.is_published ? SALON_COPY.admin.published : SALON_COPY.admin.draft}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => togglePublish(p)} style={pill}>{p.is_published ? SALON_COPY.admin.unpublish : SALON_COPY.admin.publish}</button>
              <button onClick={() => startEdit(p)} style={pill}>{SALON_COPY.admin.edit}</button>
              <button onClick={() => remove(p)} style={pillDanger}>{SALON_COPY.admin.delete}</button>
            </div>
          </div>
        ))}
      </div>

      {draft ? (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)", borderRadius: 12 }}>
          <Field label={SALON_COPY.admin.fieldName}>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.fieldCategory}>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as SalonCategory })} style={input}>
              {SALON_CATEGORIES.map((c) => <option key={c} value={c}>{SALON_COPY.categories[c]}</option>)}
            </select>
          </Field>
          <Field label={SALON_COPY.admin.fieldDescription}>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} style={{ ...input, resize: "vertical" }} />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label={SALON_COPY.admin.fieldPrice}>
              <input value={draft.price} inputMode="decimal" onChange={(e) => setDraft({ ...draft, price: e.target.value })} style={input} />
            </Field>
            <Field label={SALON_COPY.admin.fieldCurrency}>
              <input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} style={input} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <PhotoUploader productId={draftId} photos={draft.photos} onChange={(photos) => setDraft({ ...draft, photos })} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: "var(--fs-md)" }}>
            <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} />
            {SALON_COPY.admin.published}
          </label>
          {error ? <div style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 10 }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={save} disabled={saving} style={pillSolid}>{SALON_COPY.admin.save}</button>
            <button onClick={() => setDraft(null)} style={pill}>{SALON_COPY.admin.cancel}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginTop: 10 }}>
      <span style={{ display: "block", fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  width: "100%", fontSize: "var(--fs-md)", padding: "8px 10px", borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 20%, transparent)",
  background: "transparent", color: "inherit",
};
const pill: React.CSSProperties = {
  fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase",
  padding: "6px 12px", borderRadius: 999, cursor: "pointer", color: "inherit",
  border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", background: "transparent",
};
const pillSolid: React.CSSProperties = { ...pill, background: "var(--foreground)", color: "var(--background)" };
const pillDanger: React.CSSProperties = { ...pill, color: "#c0392b", borderColor: "#c0392b" };
const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
  padding: "12px 14px", borderRadius: 10,
  border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
};
```

- [ ] **Step 3: Verify product CRUD**

Run: `npm run dev -- -p 3001`, sign in at `/salon/login`, land on `/salon/admin`.
- Click "Add product", fill name/price, upload 2+ photos (verify thumbnails + reorder + cover border), check Published, Save → row appears.
- Open `/salon` → product shows under its category; detail modal shows all photos in order.
- Edit the product, change price, Save → list + public page reflect it.
- Unpublish → it disappears from `/salon` (still listed in admin as Draft).
- Delete → row removed.
Stop the server.

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/salon/PhotoUploader.tsx src/app/salon/admin/AdminDashboard.tsx
git commit -m "feat(salon): admin product CRUD with multi-photo uploader"
```

---

## Task 9: Admin shops manager

**Files:**
- Modify: `src/app/salon/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: existing `supabase`, `SALON_CATEGORIES`, types, `SALON_COPY`, the shared style consts (`pill`, `pillSolid`, `pillDanger`, `rowStyle`, `input`, `Field`).
- Produces: per-category shop create/edit/delete UI within AdminDashboard.

- [ ] **Step 1: Add shop draft state**

In `AdminDashboard.tsx`, add a shop draft type above the component (next to `Draft`):

```tsx
type ShopDraft = {
  id: string | null;
  category: SalonCategory;
  shop_name: string;
  online_url: string;
  map_address: string;
  google_maps_url: string;
};

const emptyShopDraft = (): ShopDraft => ({
  id: null, category: "hair", shop_name: "", online_url: "", map_address: "", google_maps_url: "",
});
```

- [ ] **Step 2: Replace the `void shops;` line with shop state + handlers**

In the component body, replace `void shops; // shops manager added in Task 9` with:

```tsx
  const [shopDraft, setShopDraft] = useState<ShopDraft | null>(null);
  const [shopError, setShopError] = useState("");
  const [shopSaving, setShopSaving] = useState(false);

  const startAddShop = () => { setShopDraft(emptyShopDraft()); setShopError(""); };
  const startEditShop = (s: SalonShop) => {
    setShopDraft({
      id: s.id, category: s.category, shop_name: s.shop_name,
      online_url: s.online_url ?? "", map_address: s.map_address ?? "", google_maps_url: s.google_maps_url ?? "",
    });
    setShopError("");
  };

  const saveShop = async () => {
    if (!shopDraft) return;
    if (!shopDraft.shop_name.trim()) return setShopError("Shop name is required.");
    setShopSaving(true);
    setShopError("");
    const row = {
      category: shopDraft.category,
      shop_name: shopDraft.shop_name.trim(),
      online_url: shopDraft.online_url.trim() || null,
      map_address: shopDraft.map_address.trim() || null,
      google_maps_url: shopDraft.google_maps_url.trim() || null,
    };
    const res = shopDraft.id
      ? await supabase.from("salon_shops").update(row).eq("id", shopDraft.id)
      : await supabase.from("salon_shops").insert(row);
    setShopSaving(false);
    if (res.error) return setShopError(res.error.message);
    setShopDraft(null);
    router.refresh();
  };

  const removeShop = async (s: SalonShop) => {
    if (!confirm(`Delete "${s.shop_name}"?`)) return;
    const { error } = await supabase.from("salon_shops").delete().eq("id", s.id);
    if (!error) router.refresh();
  };
```

- [ ] **Step 3: Render the shops section**

Insert this block just before the final closing `</div>` of the component's returned JSX (after the product `draft` block):

```tsx
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36 }}>
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 600, letterSpacing: "var(--ls-caps)", textTransform: "uppercase" }}>{SALON_COPY.admin.shops}</h2>
        <button onClick={startAddShop} style={pillSolid}>{SALON_COPY.admin.addShop}</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {shops.map((s) => (
          <div key={s.id} style={rowStyle}>
            <div>
              <div style={{ fontSize: "var(--fs-md)" }}>{s.shop_name}</div>
              <div style={{ fontSize: "var(--fs-sm)", opacity: 0.6 }}>
                {SALON_COPY.categories[s.category]}{s.map_address ? ` · ${s.map_address}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => startEditShop(s)} style={pill}>{SALON_COPY.admin.edit}</button>
              <button onClick={() => removeShop(s)} style={pillDanger}>{SALON_COPY.admin.delete}</button>
            </div>
          </div>
        ))}
      </div>

      {shopDraft ? (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)", borderRadius: 12 }}>
          <Field label={SALON_COPY.admin.fieldCategory}>
            <select value={shopDraft.category} onChange={(e) => setShopDraft({ ...shopDraft, category: e.target.value as SalonCategory })} style={input}>
              {SALON_CATEGORIES.map((c) => <option key={c} value={c}>{SALON_COPY.categories[c]}</option>)}
            </select>
          </Field>
          <Field label={SALON_COPY.admin.shopName}>
            <input value={shopDraft.shop_name} onChange={(e) => setShopDraft({ ...shopDraft, shop_name: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.onlineUrl}>
            <input value={shopDraft.online_url} onChange={(e) => setShopDraft({ ...shopDraft, online_url: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.mapAddress}>
            <input value={shopDraft.map_address} onChange={(e) => setShopDraft({ ...shopDraft, map_address: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.googleMapsUrl}>
            <input value={shopDraft.google_maps_url} onChange={(e) => setShopDraft({ ...shopDraft, google_maps_url: e.target.value })} style={input} />
          </Field>
          {shopError ? <div style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 10 }}>{shopError}</div> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={saveShop} disabled={shopSaving} style={pillSolid}>{SALON_COPY.admin.save}</button>
            <button onClick={() => setShopDraft(null)} style={pill}>{SALON_COPY.admin.cancel}</button>
          </div>
        </div>
      ) : null}
```

- [ ] **Step 4: Verify shops CRUD**

Run: `npm run dev -- -p 3001`, sign in, go to `/salon/admin`.
- "Add shop", pick category Hair, fill name + Google Maps URL, Save → row appears.
- Open `/salon` → Hair product detail modal shows the shop under "Where to buy".
- Edit shop name, Save → reflected. Delete → removed.
Stop the server.

- [ ] **Step 5: Build + lint + tests**

Run: `npm run build && npm run lint && npm test`
Expected: all succeed.

- [ ] **Step 6: Commit**

```bash
git add src/app/salon/admin/AdminDashboard.tsx
git commit -m "feat(salon): admin shops manager"
```

---

## Task 10: Final verification + cleanup

**Files:** none (verification only)

- [ ] **Step 1: Remove seed test data (optional)**

If the "Test Shampoo" / test shop rows from earlier tasks are not real, delete them in the Supabase SQL editor:

```sql
delete from salon_products where name = 'Test Shampoo';
delete from salon_shops where shop_name in ('Mbabane Beauty Supply');
```

- [ ] **Step 2: Full local smoke test**

Run: `npm run dev -- -p 3001` and confirm end-to-end:
- `/salon` renders header/footer, three category tabs, products, empty states; no backpack nav or links.
- Product detail modal: photo gallery, description, price, where-to-buy links work.
- `/salon/admin` redirects to `/salon/login` when signed out; admin can sign in, manage products (with multi-photo upload) and shops; non-admin is rejected.
Stop the server.

- [ ] **Step 3: Final gate**

Run: `npm run build && npm run lint && npm test`
Expected: build succeeds, lint clean, all unit tests pass.

- [ ] **Step 4: Confirm decoupling**

Run: `grep -rn "SiteHeader\|SiteFooter\|SubNav\|/customize\|/studio\|/gallery" src/app/salon src/components/salon`
Expected: no matches (salon area is fully decoupled from the backpack site).

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore(salon): final verification" || echo "nothing to commit"
```

> **Deploy:** Merging `feat/salon-catalogue` → `main` and `git push origin main` triggers the Vercel production deploy (`backpack-customizer-v2`). Do this only with explicit user approval. Confirm the production Supabase has had `supabase/salon-schema.sql` applied and the real admin email seeded before launch.
