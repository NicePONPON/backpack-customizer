# Bilingual Site (English / Traditional Chinese) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual English / Traditional Chinese toggle to the marketing site and customize tool, with no IP detection and no URL change.

**Architecture:** `next-intl` configured as a provider only (no routing integration). Root layout reads the `NEXT_LOCALE` cookie and feeds the matching message bundle to `NextIntlClientProvider`. A pill toggle in the top-right of `SiteHeader` writes the cookie and reloads. Lookbook ad images are auto-discovered from `public/advertisement/` by `EN-` / `TW-` filename prefix.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, `next-intl` (new dep), existing Tailwind + framer-motion stack.

**Spec:** `docs/superpowers/specs/2026-04-30-i18n-design.md`

**Verification model:** This codebase has no automated test suite (per `CLAUDE.md`). Every task ends with the same trio: (1) `npx tsc --noEmit` exits clean, (2) `npm run lint` reports the documented baseline of **4 errors + 1 warning, all in pre-existing files** (`PngOverlayLayer.tsx`, `SizeVisualizer.tsx`, `customize/page.tsx`, `invoice/page.tsx`) — new code adds zero issues, and (3) `npm run dev` + a manual click-through covers the surfaces touched by the task.

---

## File Structure Map

**New files:**
- `src/i18n/getLocale.ts` — server-only helper that reads the `NEXT_LOCALE` cookie. Returns `"en" | "zh-TW"`, defaulting to `"en"`.
- `src/i18n/loadMessages.ts` — server-only helper that imports the matching JSON bundle.
- `src/i18n/messages/en.json` — English source-of-truth strings.
- `src/i18n/messages/zh-TW.json` — Traditional Chinese strings (full coverage).
- `src/components/LanguageToggle.tsx` — top-right two-segment pill, client component.
- `src/lib/loadAdvertisements.ts` — server-only `fs.readdirSync` utility for the ad rail.

**Modified files:**
- `src/app/layout.tsx` — wraps children in `NextIntlClientProvider` with locale + messages.
- `src/components/SiteHeader.tsx` — mounts `LanguageToggle` absolutely positioned top-right.
- `src/components/SubNav.tsx` — link labels via `useTranslations('nav')`.
- `src/components/SiteFooter.tsx`
- `src/components/IntroVideo.tsx`
- `src/components/ShareDock.tsx`
- `src/components/Gallery.tsx`
- `src/components/SizeVisualizer.tsx`
- `src/components/EmbroideryControls.tsx`
- `src/lib/bagReference.ts` — `getDisplayName` becomes a hook-based translation reader OR exposes a key map (Task 8 nails this down).
- `src/app/page.tsx` (home)
- `src/app/gallery/page.tsx` (split into server + client per Task 6)
- `src/app/customize/page.tsx`
- `src/app/shop/page.tsx`

**Untouched (deliberately):**
- `src/app/invoice/page.tsx`, `src/components/InvoiceDocument.tsx`, `BillToForm.tsx`, `InvoiceBagPreview.tsx`, `CountryCodePicker.tsx` — `/invoice` is out of scope.
- `src/app/api/*`, `src/lib/pricing.ts`, `src/lib/invoiceSerialization.ts`, `src/lib/overlayCalibration.ts`.
- `src/components/CalibrationPanel.tsx`, `src/components/ZipperCalibrationPanel.tsx` — dev-only `?calibrate=*` panels.
- `src/components/FrontSVG.tsx`, `src/components/BackSVG.tsx` — verified during Task 8 to contain no user-visible strings; if any are found, they migrate to the `parts` namespace.

---

## Task 1: Install next-intl and wire root layout

**Files:**
- Modify: `package.json`
- Create: `src/i18n/getLocale.ts`
- Create: `src/i18n/loadMessages.ts`
- Create: `src/i18n/messages/en.json`
- Create: `src/i18n/messages/zh-TW.json`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Install dependency**

```bash
npm install next-intl@^3
```

Expected: `package.json` shows `"next-intl": "^3.x.x"`. `package-lock.json` updates.

- [ ] **Step 2: Create the locale reader**

Create `src/i18n/getLocale.ts`:

```ts
import { cookies } from "next/headers";

export type Locale = "en" | "zh-TW";
export const LOCALES: ReadonlyArray<Locale> = ["en", "zh-TW"];
export const DEFAULT_LOCALE: Locale = "en";
export const COOKIE_NAME = "NEXT_LOCALE";

function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "zh-TW";
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
```

The `cookies()` call is async in Next.js 15+; await it.

- [ ] **Step 3: Create the message loader**

Create `src/i18n/loadMessages.ts`:

```ts
import type { Locale } from "./getLocale";
import en from "./messages/en.json";
import zhTW from "./messages/zh-TW.json";

const BUNDLES = { en, "zh-TW": zhTW } as const;

export function loadMessages(locale: Locale) {
  return BUNDLES[locale];
}

export function loadFallbackMessages() {
  return BUNDLES.en;
}
```

- [ ] **Step 4: Create the empty message bundles**

Create `src/i18n/messages/en.json` with one stub key so the JSON is valid:

```json
{
  "_meta": {
    "locale": "en",
    "note": "English source-of-truth strings. Add namespaces as components are migrated."
  }
}
```

Create `src/i18n/messages/zh-TW.json`:

```json
{
  "_meta": {
    "locale": "zh-TW",
    "note": "Traditional Chinese strings. Missing keys fall back to en.json."
  }
}
```

Subsequent tasks add namespaces (`nav`, `header`, etc.) into both files in lockstep.

- [ ] **Step 5: Wrap the root layout in NextIntlClientProvider**

Read `src/app/layout.tsx` first (it's ~75 lines).

Apply this change to the imports (top of the file):

```ts
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "@/i18n/getLocale";
import { loadMessages, loadFallbackMessages } from "@/i18n/loadMessages";
```

Change the function signature from synchronous to async, and wrap the body content:

```tsx
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = loadMessages(locale);
  const fallbackMessages = loadFallbackMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          getMessageFallback={({ namespace, key }) => {
            const path = namespace ? `${namespace}.${key}` : key;
            return readByPath(fallbackMessages, path) ?? path;
          }}
        >
          {children}
          <ShareDock />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function readByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}
```

The `lang={locale}` attribute swaps the `<html lang>` value so screen readers and browser language pickers see the active locale. `getMessageFallback` walks the EN bundle for any missing zh-TW key.

- [ ] **Step 6: Verify the build is still green**

```bash
npx tsc --noEmit
npm run lint
```

Expected: `tsc` exits 0. `npm run lint` reports the documented baseline of 4 errors + 1 warning (all pre-existing files).

```bash
npm run dev
```

Open `http://localhost:3000` — the page should render unchanged. Open DevTools → Application → Cookies; confirm no `NEXT_LOCALE` cookie set yet (none of the Task 1 code writes one).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/i18n src/app/layout.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): install next-intl and wire root layout for locale read

Adds the NEXT_LOCALE cookie reader, bundle loader, and provider wrap.
Both message bundles ship with only a _meta key for now — namespaces
land per-component in subsequent tasks. Missing-key fallback walks the
en.json bundle so a half-finished translation never renders blank.
EOF
)"
```

---

## Task 2: Build LanguageToggle and mount in SiteHeader

**Files:**
- Create: `src/components/LanguageToggle.tsx`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/zh-TW.json`

- [ ] **Step 1: Add the `header` namespace strings**

Add to `src/i18n/messages/en.json` (merge into existing object):

```json
{
  "header": {
    "languageEn": "EN",
    "languageZh": "中",
    "languageToggleLabel": "Switch language"
  }
}
```

Add to `src/i18n/messages/zh-TW.json`:

```json
{
  "header": {
    "languageEn": "EN",
    "languageZh": "中",
    "languageToggleLabel": "切換語言"
  }
}
```

(The pill labels themselves stay glyph-style in both locales; only the aria-label changes.)

- [ ] **Step 2: Create the LanguageToggle component**

Create `src/components/LanguageToggle.tsx`:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type Locale = "en" | "zh-TW";

export default function LanguageToggle() {
  const locale = useLocale() as Locale;
  const t = useTranslations("header");

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    window.location.reload();
  };

  return (
    <div
      role="group"
      aria-label={t("languageToggleLabel")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(20,20,20,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: 2,
        gap: 2,
        userSelect: "none",
      }}
    >
      <Pill
        active={locale === "en"}
        onClick={() => setLocale("en")}
        label={t("languageEn")}
      />
      <Pill
        active={locale === "zh-TW"}
        onClick={() => setLocale("zh-TW")}
        label={t("languageZh")}
      />
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 22,
        minWidth: 26,
        padding: "0 8px",
        borderRadius: 999,
        border: "none",
        background: active ? "rgba(255,255,255,0.95)" : "transparent",
        color: active ? "#111" : "rgba(255,255,255,0.78)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
        cursor: active ? "default" : "pointer",
        transition: "background 200ms ease, color 200ms ease",
      }}
    >
      {label}
    </button>
  );
}
```

The `useLocale()` and `useTranslations()` hooks come from `next-intl` and read from the provider wired in Task 1.

- [ ] **Step 3: Mount LanguageToggle in SiteHeader**

Read `src/components/SiteHeader.tsx`. Apply two changes:

**Import** (top of file):

```ts
import LanguageToggle from "./LanguageToggle";
```

**Inside the `<header>` element**, after the `<Link>` containing the logo, add an absolutely positioned wrapper:

```tsx
<div
  style={{
    position: "absolute",
    top: "50%",
    right: "max(20px, env(safe-area-inset-right))",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
  }}
>
  <LanguageToggle />
</div>
```

Add `position: "relative"` to the existing `<header>` style block so the absolute child anchors against the header bar (it currently has no positioning context).

The vertical centering matches the logo's center (logo is 56px tall, header padding-top is `max(14px, env(safe-area-inset-top))`, so absolute-centering on the header bar is the cleanest anchor).

- [ ] **Step 4: Verify the toggle renders and works**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Open `http://localhost:3000`. Confirm:
- Pill is visible top-right of the header.
- Clicking `中` reloads the page; the cookie `NEXT_LOCALE=zh-TW` is set in DevTools → Application → Cookies; the pill now shows `中` highlighted.
- Clicking `EN` reloads back to English; cookie value flips to `en`.
- Pill stays vertically centered with the logo on both desktop and a 375px mobile viewport (use DevTools device toolbar).

The page content itself does not yet change between languages — that lands in Task 3+. Verify only that the toggle plumbing works.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/messages src/components/LanguageToggle.tsx src/components/SiteHeader.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): top-right language toggle in SiteHeader

Two-segment pill (EN / 中) writes NEXT_LOCALE cookie and reloads.
Absolutely positioned so the logo stays centered. Page content still
renders English in both locales until the per-component migration
lands in subsequent tasks.
EOF
)"
```

---

## Task 3: Translate SubNav, SiteFooter, IntroVideo, ShareDock

**Files:**
- Modify: `src/i18n/messages/en.json` (add `nav`, `footer`, `intro`, `share` namespaces)
- Modify: `src/i18n/messages/zh-TW.json`
- Modify: `src/components/SubNav.tsx`
- Modify: `src/components/SiteFooter.tsx`
- Modify: `src/components/IntroVideo.tsx`
- Modify: `src/components/ShareDock.tsx`

- [ ] **Step 1: Add the four namespaces to both message bundles**

Merge into `src/i18n/messages/en.json`:

```json
{
  "nav": {
    "home": "Home",
    "lookbook": "Lookbook",
    "customize": "Customize",
    "shop": "Shop"
  },
  "footer": {
    "copyright": "© 2026 {company}. All rights reserved.",
    "tagline": "Designed and engineered for modern everyday carry.",
    "defaultCompany": "Computex Systems Investments (PTY) LTD"
  },
  "intro": {
    "skipHint": "Double-tap to skip"
  },
  "share": {
    "triggerOpen": "Share this page",
    "triggerClose": "Close share menu",
    "platformWhatsapp": "Share on WhatsApp",
    "platformFacebook": "Share on Facebook",
    "platformX": "Share on X",
    "platformReddit": "Share on Reddit",
    "platformInstagram": "Copy link for Instagram",
    "platformTiktok": "Copy link for TikTok",
    "toastCopiedTo": "Link copied — paste into {platform}.",
    "toastCopyFailed": "Couldn't copy automatically. Long-press the URL bar.",
    "platformInstagramName": "Instagram",
    "platformTiktokName": "TikTok",
    "shareTagline": "Built for the way you carry. — Computex Systems"
  }
}
```

Merge into `src/i18n/messages/zh-TW.json`:

```json
{
  "nav": {
    "home": "首頁",
    "lookbook": "形象集",
    "customize": "客製化",
    "shop": "選購"
  },
  "footer": {
    "copyright": "© 2026 {company}。版權所有。",
    "tagline": "為當代日常通勤而設計與打造。",
    "defaultCompany": "Computex Systems Investments (PTY) LTD"
  },
  "intro": {
    "skipHint": "點兩下可跳過"
  },
  "share": {
    "triggerOpen": "分享此頁",
    "triggerClose": "關閉分享選單",
    "platformWhatsapp": "分享到 WhatsApp",
    "platformFacebook": "分享到 Facebook",
    "platformX": "分享到 X",
    "platformReddit": "分享到 Reddit",
    "platformInstagram": "複製連結（Instagram 用）",
    "platformTiktok": "複製連結（TikTok 用）",
    "toastCopiedTo": "連結已複製 — 請貼到 {platform}。",
    "toastCopyFailed": "自動複製失敗，請長按網址列複製。",
    "platformInstagramName": "Instagram",
    "platformTiktokName": "TikTok",
    "shareTagline": "為你的攜帶方式而生。 — Computex Systems"
  }
}
```

`{company}` and `{platform}` are ICU message placeholders that next-intl resolves at render time.

- [ ] **Step 2: Migrate SubNav**

Replace the hardcoded `LINKS` array in `src/components/SubNav.tsx` with translated labels. Add the `useTranslations` import and rebuild the array inside the component:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type Props = {
  invert?: boolean;
};

export default function SubNav({ invert = false }: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const links = [
    { href: "/", label: t("home") },
    { href: "/gallery", label: t("lookbook") },
    { href: "/customize", label: t("customize") },
    { href: "/shop", label: t("shop") },
  ];

  // ...rest of the component is unchanged, but iterates `links` instead
  // of the deleted top-level LINKS constant.
}
```

Delete the top-level `LINKS` constant. The `links.map(...)` body keeps the same active-state and styling logic that was already there.

- [ ] **Step 3: Migrate SiteFooter**

Replace the hardcoded strings in `src/components/SiteFooter.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";

type Props = {
  companyName?: string;
  invert?: boolean;
};

export default function SiteFooter({ companyName, invert = false }: Props) {
  const t = useTranslations("footer");
  const company = companyName ?? t("defaultCompany");

  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
        marginTop: 16,
        color: invert ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.45)",
        fontSize: 12,
        lineHeight: 1.6,
        letterSpacing: 0.3,
      }}
    >
      <div>{t("copyright", { company })}</div>
      <div>{t("tagline")}</div>
    </footer>
  );
}
```

The `companyName` prop default moves from a literal to a `t("defaultCompany")` lookup so callers that pass a custom name still override it.

- [ ] **Step 4: Migrate IntroVideo**

In `src/components/IntroVideo.tsx`, replace the hardcoded "Double-tap to skip" string. Add the import:

```ts
import { useTranslations } from "next-intl";
```

At the top of the component body:

```ts
const t = useTranslations("intro");
```

Replace the literal `"Double-tap to skip"` (currently on the line that renders the pill) with `{t("skipHint")}`.

- [ ] **Step 5: Migrate ShareDock**

`ShareDock.tsx` has more strings: trigger aria-label, six platform aria-labels, two toast messages, and the share tagline. Open `src/components/ShareDock.tsx`.

Add the import:

```ts
import { useTranslations } from "next-intl";
```

At the top of the `ShareDock()` function body (alongside the existing hooks):

```ts
const t = useTranslations("share");
```

Migrate, in order:

1. The top-level `SHARE_TEXT` constant becomes a runtime call. Delete the constant and replace its references inside `PLATFORMS` with `t("shareTagline")`. The cleanest way is to **build the `PLATFORMS` array inside the component body** so each `shareUrl` builder closes over `t`:

   ```tsx
   const platforms: ReadonlyArray<Platform> = [
     {
       key: "whatsapp",
       label: t("platformWhatsapp"),
       color: "#25D366",
       iconPath: WHATSAPP_ICON_PATH,
       iconViewBox: "0 0 32 32",
       shareUrl: (url) =>
         `https://wa.me/?text=${encodeURIComponent(`${t("shareTagline")} ${url}`)}`,
     },
     // ...repeat for facebook, x, reddit, instagram, tiktok
   ];
   ```

   To avoid stuffing seven 1-KB SVG path strings inside the component body, move all six `iconPath` constants to a sibling file `src/components/ShareDockIcons.ts` (a plain `export const WHATSAPP_ICON_PATH = "..."` for each) and import them. The `PLATFORMS` array body shrinks to ~50 lines.

2. The `handlePlatformClick` toast messages:
   - Replace `setToast(\`Link copied — paste into ${platformName}.\`)` with `setToast(t("toastCopiedTo", { platform: platformName }))`.
   - Replace `setToast("Couldn't copy automatically. Long-press the URL bar.")` with `setToast(t("toastCopyFailed"))`.
   - Replace the inline platform-name strings (`"Instagram"`, `"TikTok"`) with `t("platformInstagramName")` / `t("platformTiktokName")`.

3. The trigger button aria-label:
   - Replace `aria-label={open ? "Close share menu" : "Share this page"}` with `aria-label={open ? t("triggerClose") : t("triggerOpen")}`.

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Open `http://localhost:3000`:
- Sub-nav reads `Home / Lookbook / Customize / Shop` in EN mode.
- Toggle to 中: nav reads `首頁 / 形象集 / 客製化 / 選購`. Footer reads `© 2026 ... 版權所有。為當代日常通勤而設計與打造。`. Intro video skip hint reads `點兩下可跳過` (force-show by clearing `sessionStorage` in DevTools).
- Open the share dock, click Instagram → toast reads `連結已複製 — 請貼到 Instagram。`.
- Toggle back to EN: all strings revert.

Lint baseline still 4 errors + 1 warning. tsc clean.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/messages src/components/SubNav.tsx src/components/SiteFooter.tsx src/components/IntroVideo.tsx src/components/ShareDock.tsx src/components/ShareDockIcons.ts
git commit -m "$(cat <<'EOF'
feat(i18n): translate site chrome (nav, footer, intro, share dock)

Migrates SubNav, SiteFooter, IntroVideo, and ShareDock to useTranslations.
Adds nav/footer/intro/share namespaces to both message bundles. The
ShareDock platform icon paths move to a sibling file so the component
body stays readable after the t() conversion.
EOF
)"
```

---

## Task 4: Translate the home page

**Files:**
- Modify: `src/i18n/messages/en.json` (add `home` namespace)
- Modify: `src/i18n/messages/zh-TW.json`
- Modify: `src/app/page.tsx`

The home page has three text blocks: hero (`<h1>` + sub-paragraph), brand-story (5 paragraphs), and the WHY THIS BAG section (heading + 6 feature card titles/summaries/items, each with a video and a description body).

- [ ] **Step 1: Add the `home` namespace**

Merge into `src/i18n/messages/en.json`:

```json
{
  "home": {
    "hero": {
      "tagline": "Built for the way you carry.",
      "subline": "Modern everyday backpacks engineered for durability, designed without compromise."
    },
    "brandStory": {
      "lead": "We design for what everyday life actually needs.",
      "p1": "This backpack brings together protection, lightness, and simplicity—built with a dedicated laptop compartment, a water-repellent exterior, and a structure refined through real use.",
      "p2": "Not overly technical, not overly minimal. Just balanced.",
      "p3": "We believe a backpack should feel natural to carry, effortless to use, and ready for the rhythm of daily life—from commuting to movement in between.",
      "closer": "Designed to be just right."
    },
    "whyThisBag": {
      "heading": "WHY THIS BAG",
      "durability": {
        "title": "Durability",
        "summary": "Reinforced seams and weather-resistant fabric, built to outlast your commute.",
        "reinforcedStitching": {
          "title": "Reinforced Stitching",
          "description": "Bar-tacked stress points and double-row lockstitches anchor every strap and seam to the body, holding the bag intact through years of heavy loads and hard pulls."
        },
        "machineWashable": {
          "title": "Machine Washable",
          "description": "Toss it in the wash. Colorfast dyes, rust-proof hardware, and reinforced edges hold their shape and tone across dozens of cycles — fresh-looking year after year."
        }
      },
      "design": {
        "title": "Design",
        "summary": "Considered details, clean silhouettes — a bag that earns its place every day.",
        "laptopCompartment": {
          "title": "Reinforced Laptop Compartment",
          "description": "A purpose-built suspended sleeve cradles your laptop in dense foam, lifted clear of the bag floor so ground impacts dissipate before reaching your device."
        },
        "breathableStraps": {
          "title": "Super-Breathable Straps & Padding",
          "description": "Contoured shoulder straps and air-channeled mesh back padding distribute weight evenly and vent body heat, keeping long carries cool, balanced, and effortless."
        }
      },
      "quality": {
        "title": "Quality",
        "summary": "Tested materials and careful assembly. Every panel held to the same standard.",
        "shockproofFoam": {
          "title": "Shockproof Foam Armor",
          "description": "Closed-cell foam armor lines the chassis, absorbing impact energy before it reaches your gear — bumps, drops, and jostled commutes leave the contents undisturbed."
        },
        "waterResistant": {
          "title": "Water-Resistant Material",
          "description": "A high-density woven shell with hydrophobic coating beads water on contact, shedding rain and unexpected splashes so the essentials inside stay completely dry."
        }
      }
    }
  }
}
```

Merge into `src/i18n/messages/zh-TW.json`:

```json
{
  "home": {
    "hero": {
      "tagline": "為你的攜帶方式而生。",
      "subline": "為當代日常通勤打造的後背包，耐用至上、設計毫不妥協。"
    },
    "brandStory": {
      "lead": "我們為日常生活真正需要的細節而設計。",
      "p1": "這款後背包結合了防護、輕量與簡潔——專屬筆電隔層、防潑水外層，以及在真實使用中持續打磨的結構。",
      "p2": "不過度科技感，也不刻意極簡，只追求恰到好處的平衡。",
      "p3": "我們相信，一個後背包應該背起來自然、用起來毫不費力，並且能跟上日常生活的節奏——從通勤到通勤之間的每一段移動。",
      "closer": "為剛剛好而設計。"
    },
    "whyThisBag": {
      "heading": "為何選擇這款包",
      "durability": {
        "title": "耐用性",
        "summary": "強化縫線與防候布料，撐得起你日復一日的通勤。",
        "reinforcedStitching": {
          "title": "強化縫線",
          "description": "受力點以打結縫加固，雙排鎖鏈縫將每一條背帶與接縫牢牢固定於本體，承受多年重載與用力拉扯仍維持完整結構。"
        },
        "machineWashable": {
          "title": "可機洗",
          "description": "整顆丟進洗衣機沒問題。不褪色染料、防鏽五金與加固邊緣，歷經數十次清洗仍保持原貌與色澤——年復一年依舊如新。"
        }
      },
      "design": {
        "title": "設計",
        "summary": "用心的細節、俐落的輪廓——一只每天都在為自己掙得位置的包。",
        "laptopCompartment": {
          "title": "強化筆電隔層",
          "description": "專屬懸浮式內袋以高密度泡棉托住筆電，與包底保持距離，讓地面撞擊在抵達裝置前先被分散。"
        },
        "breathableStraps": {
          "title": "極致透氣肩帶與背墊",
          "description": "服貼曲線的肩帶與導氣網狀背墊，平均分散重量並排出體熱，長時間背負依然涼爽、平衡、輕省。"
        }
      },
      "quality": {
        "title": "品質",
        "summary": "嚴選材質、精心組裝，每一片面板都遵循相同標準。",
        "shockproofFoam": {
          "title": "防震泡棉護甲",
          "description": "閉孔式泡棉護甲鋪襯整個包體，將撞擊能量在抵達內容物之前先行吸收——顛簸、跌落、忙亂的通勤都不會驚擾包中裝備。"
        },
        "waterResistant": {
          "title": "防潑水材質",
          "description": "高密度織造外殼搭配疏水塗層，雨水或突如其來的潑濺一觸即珠化滑落，包內必需品始終保持乾燥。"
        }
      }
    }
  }
}
```

- [ ] **Step 2: Migrate the home page**

Read `src/app/page.tsx`. Replace the hardcoded `FEATURE_CARDS` constant and inline copy.

The page is currently a server component (no `"use client"` directive). The `useTranslations` hook works in server components too via `next-intl`. Add the import at the top:

```ts
import { useTranslations } from "next-intl";
```

Inside `HomePage()`, immediately at the top, add:

```ts
const t = useTranslations("home");
```

Replace each hardcoded string with a `t()` call. The mapping (apply each):

| Current literal | Replacement |
|---|---|
| `"Built for the way you carry."` (h1) | `{t("hero.tagline")}` |
| `"Modern everyday backpacks engineered for durability, designed without compromise."` | `{t("hero.subline")}` |
| `"We design for what everyday life actually needs."` | `{t("brandStory.lead")}` |
| `"This backpack brings together..."` paragraph | `{t("brandStory.p1")}` |
| `"Not overly technical..."` paragraph | `{t("brandStory.p2")}` |
| `"We believe a backpack should..."` paragraph | `{t("brandStory.p3")}` |
| `"Designed to be just right."` | `{t("brandStory.closer")}` |
| `"WHY THIS BAG"` heading | `{t("whyThisBag.heading")}` |

For `FEATURE_CARDS`, replace the literal-string structure with translated lookups. The cleanest pattern: keep the array shape (videos are language-agnostic file paths, so they stay literal), but pull text via `t()`:

```ts
const FEATURE_CARDS: FeatureCardData[] = [
  {
    title: t("whyThisBag.durability.title"),
    summary: t("whyThisBag.durability.summary"),
    items: [
      {
        videoSrc: "/gif/Reinforce Stitching.mp4",
        title: t("whyThisBag.durability.reinforcedStitching.title"),
        description: t("whyThisBag.durability.reinforcedStitching.description"),
      },
      {
        videoSrc: "/gif/Machine Washable.mp4",
        title: t("whyThisBag.durability.machineWashable.title"),
        description: t("whyThisBag.durability.machineWashable.description"),
      },
    ],
  },
  // ... repeat the same shape for design and quality groups
];
```

Move `FEATURE_CARDS` from module scope into the function body so `t` is in scope. (Module-scope server-component reads of `useTranslations` are not allowed.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Open `http://localhost:3000`:
- EN mode: hero, brand story, WHY THIS BAG cards all render in English exactly as before.
- Switch to 中 via the toggle: every text block on the home page renders the Chinese counterpart.
- Switch back to EN: returns to English.

Confirm video clips inside the WHY THIS BAG cards still play (they should — `videoSrc` paths weren't touched).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages src/app/page.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): translate home page (hero, brand story, why-this-bag)

Migrates the hero tagline + subline, the five-paragraph brand story,
and the three-card WHY THIS BAG section to useTranslations. Video
clip paths stay literal — only text moves into the message bundles.
EOF
)"
```

---

## Task 5: Translate gallery (page header + Gallery component + SizeVisualizer)

**Files:**
- Modify: `src/i18n/messages/en.json` (add `gallery`, `size` namespaces)
- Modify: `src/i18n/messages/zh-TW.json`
- Modify: `src/app/gallery/page.tsx` (text only — ad rail rework comes in Task 6)
- Modify: `src/components/Gallery.tsx`
- Modify: `src/components/SizeVisualizer.tsx`

The gallery page header reads `GALLERY`. The `Gallery` component has the bag photo labels (`14"` / `16"` size + color names — these are derived from the filename and stay English for now), the "Coming Soon" placeholder card with subLabel `2026 Summer`, and the notify-me form (placeholder, button, success message, error). `SizeVisualizer` has the "How it wears" eyebrow and the height annotations (`175 cm` / `5'9"`).

- [ ] **Step 1: Add the `gallery` and `size` namespaces**

Merge into `src/i18n/messages/en.json`:

```json
{
  "gallery": {
    "sectionHeading": "GALLERY",
    "comingSoonLabel": "Coming Soon",
    "comingSoonSubLabel": "2026 Summer",
    "notifyEmailPlaceholder": "your@email.com",
    "notifyButtonIdle": "Notify me",
    "notifyButtonSubmitting": "Sending…",
    "notifySuccess": "Thanks — we'll let you know.",
    "notifyErrorGeneric": "Something went wrong."
  },
  "size": {
    "howItWears": "How it wears"
  }
}
```

Merge into `src/i18n/messages/zh-TW.json`:

```json
{
  "gallery": {
    "sectionHeading": "形象集",
    "comingSoonLabel": "即將上市",
    "comingSoonSubLabel": "2026 夏季",
    "notifyEmailPlaceholder": "your@email.com",
    "notifyButtonIdle": "通知我",
    "notifyButtonSubmitting": "傳送中…",
    "notifySuccess": "謝謝 — 上市時會通知你。",
    "notifyErrorGeneric": "發生錯誤，請稍後再試。"
  },
  "size": {
    "howItWears": "上身效果"
  }
}
```

(Bag photo labels like `14" Frost Gray` stay English — the color name is derived from filename and is a marketing proper noun. We'll revisit if the user asks; not in scope per the spec.)

(Height annotations `175 cm` / `5'9"` are numeric/unit and stay literal — `cm` and the apostrophe-foot notation are universally readable.)

- [ ] **Step 2: Migrate the gallery page header**

In `src/app/gallery/page.tsx` (Task 6 will rework the ad rail; this step only touches the section heading text):

```ts
import { useTranslations } from "next-intl";
```

Inside `GalleryPage()`:

```ts
const t = useTranslations("gallery");
```

Replace `<h2 style={sectionHeaderStyle}>GALLERY</h2>` with `<h2 style={sectionHeaderStyle}>{t("sectionHeading")}</h2>`.

- [ ] **Step 3: Migrate Gallery.tsx**

`src/components/Gallery.tsx` has two surfaces: the existing gallery cards (whose label `14" Frost Gray` is derived from the filename via `imageLabel()` — stays as-is), and the `ComingSoonCardContent` form.

Add the import:

```ts
import { useTranslations } from "next-intl";
```

In `ComingSoonCardContent()`:

```ts
const t = useTranslations("gallery");
```

Replace the literals:
- The placeholder `label` and `subLabel` props are passed in from `ITEMS` at module scope. Update the `ITEMS` definition: instead of hardcoded `label: "Coming Soon"` / `subLabel: "2026 Summer"`, leave the `ITEMS` const at module scope but **stop using its `label`/`subLabel` for placeholders** — drop those two fields from the placeholder shape and have `ComingSoonCardContent` read `t("comingSoonLabel")` / `t("comingSoonSubLabel")` directly. Update `ComingSoonProps` to drop the two string fields.
- `placeholder="your@email.com"` → `placeholder={t("notifyEmailPlaceholder")}`
- The button text `{status === "submitting" ? "Sending…" : "Notify me"}` → `{status === "submitting" ? t("notifyButtonSubmitting") : t("notifyButtonIdle")}`
- The success message `Thanks — we'll let you know.` → `{t("notifySuccess")}`
- In the catch block: `setErrorMsg(err instanceof Error ? err.message : "Something went wrong.")` → `setErrorMsg(err instanceof Error ? err.message : t("notifyErrorGeneric"))`. The first branch (using `err.message`) still passes through whatever the API returns in English; that's acceptable for this task — server-side error strings translation is out of scope per the spec.

- [ ] **Step 4: Migrate SizeVisualizer**

In `src/components/SizeVisualizer.tsx`:

```ts
import { useTranslations } from "next-intl";
```

Inside `SizeVisualizer()`:

```ts
const t = useTranslations("size");
```

Replace the literal `"How it wears"` (eyebrow text) with `{t("howItWears")}`.

The `TunePanel` strings (`"Tune visualizer · adjusting"`, `"Reset"`, `"Copy JSON"`, slider labels) are dev-only behind `?tune=visualizer` and stay English — they're calibration debugging UI.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Open `http://localhost:3000/gallery`:
- EN: section reads `GALLERY`. Visualizer eyebrow reads `How it wears`. Coming Soon card shows English labels and form copy.
- Switch to 中: section reads `形象集`. Eyebrow reads `上身效果`. Coming Soon card shows `即將上市 / 2026 夏季 / your@email.com / 通知我`.
- Submit a valid email → `謝謝 — 上市時會通知你。`. Submit an invalid email → server-supplied error text (English passthrough is intentional).

Lint baseline still 4 errors + 1 warning. Tsc clean.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/messages src/app/gallery/page.tsx src/components/Gallery.tsx src/components/SizeVisualizer.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): translate gallery section header, Coming Soon card, size visualizer eyebrow

Bag photo labels (14" Frost Gray etc.) stay English since they're
derived from filename and treated as marketing proper nouns. The
TunePanel debug UI also stays English (dev-only).
EOF
)"
```

---

## Task 6: Auto-discover advertisement images by EN-/TW- prefix

**Files:**
- Create: `src/lib/loadAdvertisements.ts`
- Modify: `src/app/gallery/page.tsx` (split AdvertisementPanel into server + client)

The current `AdvertisementPanel` in `src/app/gallery/page.tsx` is a client component with a hardcoded `AD_IMAGES` array. After this task, the array goes away — the panel reads `public/advertisement/` at server render time and ships only the matching-locale URLs to the client.

- [ ] **Step 1: Create the loader utility**

Create `src/lib/loadAdvertisements.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

import type { Locale } from "@/i18n/getLocale";

export type AdImage = { src: string; alt: string };

const ALT_TEXT: Record<Locale, (slot: string) => string> = {
  en: (slot) => `Computex ${slot.replace(/[-_]/g, " ").trim()}`,
  "zh-TW": (slot) => `Computex ${slot.replace(/[-_]/g, " ").trim()} 廣告`,
};

export function loadAdvertisements(locale: Locale): AdImage[] {
  const prefix = locale === "zh-TW" ? "TW-" : "EN-";
  const dir = path.join(process.cwd(), "public/advertisement");

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((f) => f.startsWith(prefix) && f.toLowerCase().endsWith(".png"))
    .sort()
    .map((f) => ({
      src: `/advertisement/${f}`,
      alt: ALT_TEXT[locale](f.slice(prefix.length).replace(/\.png$/i, "")),
    }));
}
```

The `try/catch` on `readdirSync` keeps the page rendering even if the directory disappears (degraded to "no ads") rather than throwing during render.

- [ ] **Step 2: Split AdvertisementPanel into server + client**

In `src/app/gallery/page.tsx`, the file currently has `"use client"` at the top because `GalleryPage` uses `useState` for the selected bag. The cleanest path:

1. **Keep the page itself client** (it needs state for the bag selection).
2. **Pass ad data in as a prop** — but client components can't call server-only `loadAdvertisements()` (`fs` doesn't ship to the client).
3. **Solution:** lift the call to a server component above the page. But Next.js routes the file at `app/gallery/page.tsx` — that page IS the route. We can't lift above it.

The viable pattern: **convert the page to a server component, hoist the bag-selection state into a child client component**. Concretely:

Restructure `src/app/gallery/page.tsx`:

```tsx
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { loadAdvertisements } from "@/lib/loadAdvertisements";
import { getLocale } from "@/i18n/getLocale";
import GalleryPageClient from "./GalleryPageClient";

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#555555, #222222)",
  backgroundAttachment: "fixed",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0 24px 48px",
  gap: 48,
  color: "#fff",
};

export default async function GalleryPage() {
  const locale = await getLocale();
  const ads = loadAdvertisements(locale);

  return (
    <main style={pageBg}>
      <SiteHeader />
      <GalleryPageClient ads={ads} />
      <SiteFooter />
    </main>
  );
}
```

Create the new file `src/app/gallery/GalleryPageClient.tsx` with everything from the previous client-side `GalleryPage`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Gallery, { type GalleryImage } from "@/components/Gallery";
import SizeVisualizer from "@/components/SizeVisualizer";
import type { AdImage } from "@/lib/loadAdvertisements";

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
};

const sectionHeaderStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: 2,
  margin: "0 0 24px",
  color: "#fff",
};

const AD_SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const AD_CARD_W = "clamp(280px, 92vw, 900px)";

type Props = {
  ads: AdImage[];
};

export default function GalleryPageClient({ ads }: Props) {
  const t = useTranslations("gallery");
  const [selectedBag, setSelectedBag] = useState<GalleryImage | null>(null);

  return (
    <>
      {ads.length > 0 && (
        <section style={{ ...sectionStyle, marginTop: 8 }}>
          <AdRail ads={ads} />
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>{t("sectionHeading")}</h2>
        <Gallery onActiveChange={setSelectedBag} />
        <SizeVisualizer
          sizeClass={selectedBag?.sizeClass ?? null}
          bagSlot={
            selectedBag ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={encodeURI(selectedBag.src)}
                alt=""
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                }}
              />
            ) : null
          }
        />
      </section>
    </>
  );
}

function AdRail({ ads }: { ads: AdImage[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const update = () => {
      const r = track.getBoundingClientRect();
      const center = r.left + r.width / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const ir = el.getBoundingClientRect();
        const ic = ir.left + ir.width / 2;
        const d = Math.abs(ic - center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      setActiveIdx(bestIdx);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        marginInline: "calc(50% - 50vw)",
        width: "100vw",
      }}
    >
      <style>{`.ad-track::-webkit-scrollbar{display:none}`}</style>
      <div
        ref={trackRef}
        className="ad-track"
        style={{
          display: "flex",
          gap: 18,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBlock: 12,
          paddingInline: `calc(50vw - (${AD_CARD_W}) / 2)`,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        }}
      >
        {ads.map((ad, i) => {
          const active = i === activeIdx;
          return (
            <div
              key={ad.src}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              onClick={() => {
                itemRefs.current[i]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              style={{
                position: "relative",
                flex: "0 0 auto",
                width: AD_CARD_W,
                aspectRatio: "9 / 16",
                scrollSnapAlign: "center",
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
                boxShadow: active
                  ? "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18)"
                  : "0 8px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.14)",
                transform: active ? "scale(1)" : "scale(0.9)",
                opacity: active ? 1 : 0.5,
                transition: `transform 0.6s ${AD_SMOOTH_EASE}, opacity 0.6s ${AD_SMOOTH_EASE}, box-shadow 0.6s ${AD_SMOOTH_EASE}`,
                willChange: "transform, opacity",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.src}
                alt={ad.alt}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  userSelect: "none",
                }}
              />
            </div>
          );
        })}
      </div>

      {ads.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 14,
          }}
          aria-hidden
        >
          <div
            style={{
              position: "relative",
              width: 220,
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${((activeIdx + 1) / ads.length) * 100}%`,
                borderRadius: 999,
                background: "rgba(255,255,255,0.88)",
                transition: `width 0.4s ${AD_SMOOTH_EASE}`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

The previous `AdvertisementPanel` function and the `AD_IMAGES` constant are removed entirely from `gallery/page.tsx`. The previous `AD_CARD_W` / `AD_SMOOTH_EASE` constants move into `GalleryPageClient.tsx`.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Open `http://localhost:3000/gallery`:
- EN mode: rail shows `EN-Comparison.png`, `EN-Hero.png`, `EN-Segregation.png` (alphabetical order). Three cards.
- Switch to 中: rail shows `TW-*.png` counterparts. Same three cards, all Chinese versions.
- Drop a new pair into `public/advertisement/` (e.g., `EN-Newslide.png` + `TW-Newslide.png`), refresh — both rails get a fourth card. (Optional sanity check; revert the test files after.)
- If only `EN-Foo.png` exists with no `TW-Foo.png`, the zh-TW rail simply has one fewer card — no fallback to the EN file.

Lint baseline still 4 errors + 1 warning.

- [ ] **Step 4: Commit**

```bash
git add src/lib/loadAdvertisements.ts src/app/gallery/page.tsx src/app/gallery/GalleryPageClient.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): auto-discover ad images from public/advertisement/ by locale prefix

Splits the gallery page into a server outer (reads cookie + filesystem)
and a GalleryPageClient inner (handles bag selection + ad rail UX).
Ad list is now derived from EN-*.png / TW-*.png files at render time
— drop a new pair in and they appear without code changes.
EOF
)"
```

---

## Task 7: Translate the shop page

**Files:**
- Modify: `src/i18n/messages/en.json` (add `shop` namespace)
- Modify: `src/i18n/messages/zh-TW.json`
- Modify: `src/app/shop/page.tsx`

The shop page has the heading, the routing-explanation paragraph, four region taglines (TW / SZ / ZA / US), and the `Visit local store →` CTA.

- [ ] **Step 1: Add the `shop` namespace**

Merge into `src/i18n/messages/en.json`:

```json
{
  "shop": {
    "heading": "Choose your region",
    "subheading": "We'll route you to the local distributor or retail platform that ships to your region.",
    "visitCta": "Visit local store →",
    "regionTagline": {
      "TW": "Available through our Taiwan retail partners.",
      "SZ": "Local pickup and delivery across Eswatini.",
      "ZA": "Shipping nationwide via our South African distributor.",
      "US": "Available on our United States e-commerce partner."
    }
  }
}
```

Merge into `src/i18n/messages/zh-TW.json`:

```json
{
  "shop": {
    "heading": "選擇你的地區",
    "subheading": "我們會將你導向當地的經銷夥伴或負責配送你所在地區的零售平台。",
    "visitCta": "前往當地門市 →",
    "regionTagline": {
      "TW": "由台灣零售夥伴銷售。",
      "SZ": "於史瓦帝尼提供本地取貨與配送。",
      "ZA": "由南非經銷商提供全國配送。",
      "US": "由美國電商夥伴銷售。"
    }
  }
}
```

Country names (`Taiwan`, `Eswatini`, etc.) come from `src/lib/countries.ts` — those stay English in this task. (Out of scope; the country list is shared with `/invoice`'s BillTo form which is also out of scope.)

- [ ] **Step 2: Migrate `src/app/shop/page.tsx`**

Add the import:

```ts
import { useTranslations } from "next-intl";
```

Inside `ShopPage()`:

```ts
const t = useTranslations("shop");
```

Apply the substitutions:
- `<h1>Choose your region</h1>` → `<h1>{t("heading")}</h1>`.
- The `<p>We'll route you to the local distributor...</p>` → `<p>{t("subheading")}</p>`.
- The `Visit local store →` literal → `{t("visitCta")}`.
- The `REGION_TAGLINES` map at the top of the file: replace each English value with `t(`regionTagline.${c.code}`)`. Move the lookup inside the `COUNTRIES.map(...)` body:

```tsx
{COUNTRIES.map((c) => {
  const url = DISTRIBUTOR_URLS[c.code] ?? "#";
  // Some country codes may not have a tagline configured yet — fall back
  // to empty string rather than rendering the key path.
  const tagline = (() => {
    try {
      return t(`regionTagline.${c.code}`);
    } catch {
      return "";
    }
  })();
  return (...);
})}
```

The `try/catch` shields against future country additions that don't yet have a translation key.

Delete the top-level `REGION_TAGLINES` constant after the migration.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Open `http://localhost:3000/shop`:
- EN: heading reads `Choose your region`, taglines read in English, CTA reads `Visit local store →`.
- 中: heading reads `選擇你的地區`, taglines render their Chinese counterparts, CTA reads `前往當地門市 →`. Country names (Taiwan, Eswatini, etc.) stay English — that's the documented out-of-scope.

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages src/app/shop/page.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): translate shop page (heading, region taglines, CTA)

Country names stay English — they're shared with the BillTo form
on /invoice which is out of scope for this i18n delivery.
EOF
)"
```

---

## Task 8: Translate the customize tool

**Files:**
- Modify: `src/i18n/messages/en.json` (add `customize`, `embroidery`, `colors`, `parts`, `summary` namespaces)
- Modify: `src/i18n/messages/zh-TW.json`
- Modify: `src/lib/bagReference.ts`
- Modify: `src/components/EmbroideryControls.tsx`
- Modify: `src/app/customize/page.tsx`

This is the largest task. The customize page has section headers (Color, Embroidery, Zipper, Size, Summary), a 7-group color palette with ~40 named swatches, the embroidery controls (Lines / Font style / Position / Thread color cards), the size pill (`14 inch` / `16 inch`), and the summary table (column headers + part-name rows).

- [ ] **Step 1: Add the five namespaces**

Merge into `src/i18n/messages/en.json`:

```json
{
  "customize": {
    "sections": {
      "color": "COLOR",
      "embroidery": "EMBROIDERY",
      "zipper": "ZIPPER",
      "size": "SIZE",
      "summary": "SUMMARY"
    },
    "view": {
      "front": "Front",
      "back": "Back"
    },
    "size": {
      "fourteenInch": "14 inch",
      "sixteenInch": "16 inch"
    },
    "actions": {
      "generateQuotation": "Generate quotation"
    }
  },
  "embroidery": {
    "lines": "Lines",
    "fontStyle": "Font style",
    "position": "Position",
    "threadColor": "Thread color",
    "lineCount1": "1 line",
    "lineCount2": "2 lines",
    "linePlaceholder": "Line {n}",
    "sizeSmall": "S",
    "sizeMedium": "M",
    "sizeLarge": "L",
    "fontSerif": "Serif",
    "fontSans": "Sans-Serif",
    "positionTop": "Front Top",
    "positionBottom": "Front Bottom",
    "colorBlack": "Black",
    "colorWhite": "White",
    "colorGray": "Gray",
    "colorRed": "Red",
    "colorBlue": "Blue",
    "colorYellow": "Yellow"
  },
  "colors": {
    "groups": {
      "coreDark": "Core Dark",
      "natureGreens": "Nature Greens",
      "lightGreensYellow": "Light Greens & Yellow",
      "earthBrown": "Earth & Brown",
      "warmRed": "Warm / Red",
      "softNeutral": "Soft / Neutral",
      "grayScale": "Gray Scale"
    },
    "swatches": {
      "charcoalAbyss": "Charcoal Abyss",
      "midnightNavy": "Midnight Navy",
      "eclipseBlue": "Eclipse Blue",
      "nocturneBlue": "Nocturne Blue",
      "regalTide": "Regal Tide",
      "icedHorizon": "Iced Horizon",
      "pineSmoke": "Pine Smoke",
      "mossDusk": "Moss Dusk",
      "tideglassBlues": "Tideglass Blues",
      "aquaGrove": "Aqua Grove",
      "mintDust": "Mint Dust",
      "glacialMint": "Glacial Mint",
      "oliveCream": "Olive Cream",
      "lemonFern": "Lemon Fern",
      "butterGlow": "Butter Glow",
      "limeDew": "Lime Dew",
      "vanillaFlare": "Vanilla Flare",
      "ivoryDune": "Ivory Dune",
      "cocoaDrift": "Cocoa Drift",
      "rustEmber": "Rust Ember",
      "honeyClay": "Honey Clay",
      "fadedAlmond": "Faded Almond",
      "goldenWheat": "Golden Wheat",
      "stoneOat": "Stone Oat",
      "cinnamonClay": "Cinnamon Clay",
      "wineEmber": "Wine Ember",
      "chiliFlame": "Chili Flame",
      "apricotDust": "Apricot Dust",
      "desertBlush": "Desert Blush",
      "barePetal": "Bare Petal",
      "lavenderMist": "Lavender Mist",
      "winterAzure": "Winter Azure",
      "roseBlush": "Rose Blush",
      "featherRose": "Feather Rose",
      "biscuitBeige": "Biscuit Beige",
      "sunlitCotton": "Sunlit Cotton",
      "ashSteel": "Ash Steel",
      "frostGray": "Frost Gray",
      "blushedSnow": "Blushed Snow"
    }
  },
  "parts": {
    "none": "None",
    "sidePart": "Side Part",
    "backCentralPart": "Back Central Part",
    "strap": "Strap",
    "band": "Band",
    "backSidePart": "Back Side Part",
    "bottom": "Bottom",
    "sidePanel": "Side Panel",
    "frontBottomPart": "Front Bottom Part",
    "frontTopPart": "Front Top Part",
    "frontSidePart": "Front Side Part"
  },
  "summary": {
    "headerPart": "Part",
    "headerColor": "Color",
    "headerHex": "Hex"
  }
}
```

Merge into `src/i18n/messages/zh-TW.json`:

```json
{
  "customize": {
    "sections": {
      "color": "顏色",
      "embroidery": "刺繡",
      "zipper": "拉鍊",
      "size": "尺寸",
      "summary": "規格摘要"
    },
    "view": {
      "front": "正面",
      "back": "背面"
    },
    "size": {
      "fourteenInch": "14 吋",
      "sixteenInch": "16 吋"
    },
    "actions": {
      "generateQuotation": "產生報價單"
    }
  },
  "embroidery": {
    "lines": "行數",
    "fontStyle": "字體樣式",
    "position": "位置",
    "threadColor": "繡線顏色",
    "lineCount1": "1 行",
    "lineCount2": "2 行",
    "linePlaceholder": "第 {n} 行",
    "sizeSmall": "小",
    "sizeMedium": "中",
    "sizeLarge": "大",
    "fontSerif": "襯線體",
    "fontSans": "黑體",
    "positionTop": "正面上方",
    "positionBottom": "正面下方",
    "colorBlack": "黑",
    "colorWhite": "白",
    "colorGray": "灰",
    "colorRed": "紅",
    "colorBlue": "藍",
    "colorYellow": "黃"
  },
  "colors": {
    "groups": {
      "coreDark": "深色核心",
      "natureGreens": "自然綠",
      "lightGreensYellow": "淺綠與黃",
      "earthBrown": "大地棕",
      "warmRed": "暖紅",
      "softNeutral": "柔和中性",
      "grayScale": "灰階"
    },
    "swatches": {
      "charcoalAbyss": "炭墨深淵",
      "midnightNavy": "午夜海軍",
      "eclipseBlue": "蝕日藍",
      "nocturneBlue": "夜曲藍",
      "regalTide": "御潮藍",
      "icedHorizon": "霜霽地平",
      "pineSmoke": "松煙綠",
      "mossDusk": "苔暮綠",
      "tideglassBlues": "潮玻璃藍",
      "aquaGrove": "碧林湖",
      "mintDust": "薄荷霧",
      "glacialMint": "冰川薄荷",
      "oliveCream": "橄欖奶霜",
      "lemonFern": "檸蕨綠",
      "butterGlow": "奶油暖陽",
      "limeDew": "青檸晨露",
      "vanillaFlare": "香草微光",
      "ivoryDune": "象牙沙丘",
      "cocoaDrift": "可可漂木",
      "rustEmber": "鏽燼橘",
      "honeyClay": "蜜陶土",
      "fadedAlmond": "褪杏色",
      "goldenWheat": "金穗黃",
      "stoneOat": "石麥米",
      "cinnamonClay": "肉桂陶",
      "wineEmber": "酒燼紅",
      "chiliFlame": "辣火紅",
      "apricotDust": "杏霧粉",
      "desertBlush": "沙漠霞",
      "barePetal": "素瓣粉",
      "lavenderMist": "薰衣紫霧",
      "winterAzure": "冬青蔚藍",
      "roseBlush": "玫瑰胭脂",
      "featherRose": "羽翎玫瑰",
      "biscuitBeige": "餅乾米",
      "sunlitCotton": "陽光棉",
      "ashSteel": "鋼灰",
      "frostGray": "霜灰",
      "blushedSnow": "胭脂雪"
    }
  },
  "parts": {
    "none": "未選擇",
    "sidePart": "側面部位",
    "backCentralPart": "背面中央",
    "strap": "背帶",
    "band": "繃帶",
    "backSidePart": "背面側板",
    "bottom": "底部",
    "sidePanel": "側板",
    "frontBottomPart": "正面下方",
    "frontTopPart": "正面上方",
    "frontSidePart": "正面側板"
  },
  "summary": {
    "headerPart": "部位",
    "headerColor": "顏色",
    "headerHex": "色碼"
  }
}
```

- [ ] **Step 2: Migrate `src/lib/bagReference.ts`**

`getDisplayName(part)` and `getColorName(hex)` are pure functions called from server-rendered places (via `re-export from page.tsx`). They cannot use `useTranslations()` directly. Convert them to **return a key path**, and let callers resolve via `t()`.

Replace `getDisplayName`:

```ts
// Returns a key suffix under the `parts` namespace. Callers resolve it
// via useTranslations("parts")(getDisplayNameKey(part)).
export function getDisplayNameKey(part: string | null): string {
  if (!part) return "none";
  if (part === "FRONT_BACK_SIDE") return "sidePart";
  if (part.startsWith("Back_Main")) return "backCentralPart";
  if (part.startsWith("Back_Strap")) return "strap";
  if (part.startsWith("Band")) return "band";
  if (part.startsWith("Back_Side")) return "backSidePart";
  if (part.startsWith("Bottom")) return "bottom";
  if (part.startsWith("SidePanel")) return "sidePanel";
  if (part.startsWith("Side_")) return "sidePart";
  if (part.startsWith("Front_Main_Bottom")) return "frontBottomPart";
  if (part.startsWith("Front_Main_Top")) return "frontTopPart";
  if (part.startsWith("Front_Side")) return "frontSidePart";
  // Unknown id — return the raw id so it's at least debuggable rather
  // than rendering as "missing translation".
  return part;
}
```

Keep the old `getDisplayName` exported as a thin wrapper for `/invoice` (which is out of scope and stays English):

```ts
export function getDisplayName(part: string | null): string {
  // ...the original switch, unchanged...
}
```

Both functions co-exist. `/customize` callers migrate to `getDisplayNameKey`; `/invoice` callers keep using `getDisplayName`.

For `getColorName(hex)`, the cleanest pattern is similar — return a key:

```ts
export function getColorNameKey(hex: string): string | null {
  for (const group of COLOR_GROUPS) {
    const found = group.colors.find((c) => c.value === hex);
    if (found) return found.key;
  }
  return null;
}
```

This requires adding a `key` field to each `ColorSwatch`:

```ts
export type ColorSwatch = { key: string; name: string; value: string };
```

And updating `COLOR_GROUPS`:

```ts
export const COLOR_GROUPS: ColorGroup[] = [
  {
    title: "Core Dark",
    titleKey: "coreDark",
    colors: [
      { key: "charcoalAbyss", name: "Charcoal Abyss", value: "#14181A" },
      { key: "midnightNavy", name: "Midnight Navy", value: "#384355" },
      // ...repeat for every swatch with the keys defined in the messages
    ],
  },
  // ...repeat for the other six groups with their titleKeys
];
```

`ColorGroup` becomes:

```ts
export type ColorGroup = { title: string; titleKey: string; colors: ColorSwatch[] };
```

The `title` and `name` fields stay (for `/invoice` and any English-only callers); the new `titleKey` and `key` fields drive the `/customize` translation lookups. This is a minor data duplication; the alternative (deleting `name`/`title` and forcing every caller through `t()`) breaks the invoice rendering path.

- [ ] **Step 3: Migrate EmbroideryControls**

Open `src/components/EmbroideryControls.tsx`. Add the import:

```ts
import { useTranslations } from "next-intl";
```

At the top of the component:

```ts
const t = useTranslations("embroidery");
```

Replace literals (apply each):

| Current literal | Replacement |
|---|---|
| `"Lines"` (cardTitle) | `{t("lines")}` |
| `"Font style"` | `{t("fontStyle")}` |
| `"Position"` | `{t("position")}` |
| `"Thread color"` | `{t("threadColor")}` |
| `{n} line{n === 2 ? "s" : ""}` button text | `{n === 1 ? t("lineCount1") : t("lineCount2")}` |
| `placeholder={\`Line ${index + 1}\`}` | `placeholder={t("linePlaceholder", { n: index + 1 })}` |
| `f === "serif" ? "Serif" : "Sans-Serif"` | `f === "serif" ? t("fontSerif") : t("fontSans")` |
| `Front Top` button | `{t("positionTop")}` |
| `Front Bottom` button | `{t("positionBottom")}` |

For the `EMBROIDERY_COLORS` array (top of file, currently `name: "Black"` etc.), the names are now keys into the `embroidery.color*` set. Two options:

a) Add a `nameKey` field and look it up in render: `{t(c.nameKey)}`.
b) Delete the `name` field entirely and inline the lookup using `c.value`.

Pick (a) — minimal change:

```ts
export const EMBROIDERY_COLORS: Array<{
  value: EmbroideryColor;
  name: string;
  nameKey: string;
}> = [
  { value: "#000000", name: "Black", nameKey: "colorBlack" },
  { value: "#FFFFFF", name: "White", nameKey: "colorWhite" },
  { value: "#808080", name: "Gray", nameKey: "colorGray" },
  { value: "#D32F2F", name: "Red", nameKey: "colorRed" },
  { value: "#1976D2", name: "Blue", nameKey: "colorBlue" },
  { value: "#FBC02D", name: "Yellow", nameKey: "colorYellow" },
];
```

In the render: `{t(c.nameKey)}` instead of `{c.name}`.

The `SIZE_LABELS` constant (`{ small: "S", medium: "M", large: "L" }`) is single-letter and language-agnostic. Switch it to translation keys for consistency:

```tsx
{SIZE_KEYS.map((s) => (
  <button
    key={s}
    onClick={() => setLineSize(index, s)}
    style={miniPillStyle(lineSizes[index] === s)}
    title={t(`size${s.charAt(0).toUpperCase() + s.slice(1)}`)}
  >
    {t(`size${s.charAt(0).toUpperCase() + s.slice(1)}`)}
  </button>
))}
```

(Resolves to `embroidery.sizeSmall`, `embroidery.sizeMedium`, `embroidery.sizeLarge`. The Chinese forms render `小 / 中 / 大`.)

Delete the `SIZE_LABELS` constant.

- [ ] **Step 4: Migrate `src/app/customize/page.tsx`**

This is the heaviest file (~535 lines). Open it. Apply the same pattern:

1. Add `import { useTranslations } from "next-intl";`.
2. At the top of the component body, get the relevant namespace handles:
   ```ts
   const tCustomize = useTranslations("customize");
   const tColors = useTranslations("colors");
   const tParts = useTranslations("parts");
   const tSummary = useTranslations("summary");
   ```
3. **Section headings** — search the file for the literal strings `COLOR`, `EMBROIDERY`, `ZIPPER`, `SIZE`, `SUMMARY` rendered as `<h2>` (or equivalent) and replace each with `{tCustomize(\`sections.color\`)}` etc.
4. **Front / Back labels** — wherever the bag view tab / label reads `Front` / `Back`, replace with `{tCustomize("view.front")}` / `{tCustomize("view.back")}`.
5. **Size pill** — the literal `14 inch` / `16 inch` button text → `{tCustomize("size.fourteenInch")}` / `{tCustomize("size.sixteenInch")}`.
6. **Generate quotation button** — find the button that links to `/invoice?d=...`. Replace its label with `{tCustomize("actions.generateQuotation")}`. The href stays unchanged (locale is intentionally dropped on `/invoice`).
7. **Color group titles** — wherever `COLOR_GROUPS.map(g => ...)` renders `g.title`, replace with `{tColors(\`groups.${g.titleKey}\`)}`.
8. **Color swatch tooltips** — wherever a swatch shows `c.name` (likely as a `title` attribute or label below the swatch), replace with `{tColors(\`swatches.${c.key}\`)}`.
9. **Summary table headers** — column headers `Part`, `Color`, `Hex` → `{tSummary("headerPart")}`, `{tSummary("headerColor")}`, `{tSummary("headerHex")}`.
10. **Summary part-name cells** — wherever the table shows the part label (currently `getDisplayName(part)`), import `getDisplayNameKey` and use `{tParts(getDisplayNameKey(part))}`.
11. **Summary color-name cells** — replace `getColorName(hex)` with `getColorNameKey(hex)`, falling back to the raw hex for unmatched values: `{key ? tColors(\`swatches.${key}\`) : hex}`.

Apply all eleven substitutions in a single pass. The rest of the file (state management, SVG rendering, event handlers) does not change.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
npm run lint
npm run dev
```

Open `http://localhost:3000/customize`:
- EN mode: every section heading, button, swatch label, and summary cell renders English exactly as before.
- Switch to 中: all of the above render Chinese. Pick a few specific spot-checks:
  - Color group `自然綠` instead of `Nature Greens`.
  - Hover a swatch — tooltip reads `松煙綠` (zh-TW) vs `Pine Smoke` (en).
  - Embroidery card `刺繡`. Position pills `正面上方 / 正面下方`. Color circle labels `黑 / 白 / 灰 / 紅 / 藍 / 黃`.
  - Size pills `14 吋 / 16 吋`.
  - Summary table headers `部位 / 顏色 / 色碼`. Pick a part — the row reads `正面上方` instead of `Front Top Part`.
  - Click `產生報價單` → lands on `/invoice?d=...` rendered in **English** (intentional out-of-scope).

Lint baseline still 4 errors + 1 warning (the customize/page.tsx existing errors don't multiply).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/messages src/lib/bagReference.ts src/components/EmbroideryControls.tsx src/app/customize/page.tsx
git commit -m "$(cat <<'EOF'
feat(i18n): translate customize tool (colors, embroidery, summary, parts)

bagReference exposes new key-returning getters (getDisplayNameKey,
getColorNameKey) used by /customize callers. The original name-returning
getters stay for /invoice (out of scope). Color names get Chinese
marketing names per the spec; group titles use a titleKey field.
EOF
)"
```

---

## Task 9: Polish — fallback verification, mobile QA, baseline confirmation

**Files:**
- Read: every modified file (no edits unless a regression is found).
- Modify (if needed): any file flagged during this audit pass.

This task validates the spec end-to-end and catches any string slipped through.

- [ ] **Step 1: Audit for hardcoded English strings**

Run a sweep across the surfaces in scope. Use Grep:

```bash
# Look for capitalized literal strings still in JSX outside the messages files.
# Filter out expected matches: filenames, hex codes, CSS values.
```

Check, in particular:
- `src/app/page.tsx`
- `src/app/gallery/page.tsx` and `src/app/gallery/GalleryPageClient.tsx`
- `src/app/customize/page.tsx`
- `src/app/shop/page.tsx`
- `src/components/SubNav.tsx`, `SiteFooter.tsx`, `IntroVideo.tsx`, `ShareDock.tsx`, `Gallery.tsx`, `SizeVisualizer.tsx`, `EmbroideryControls.tsx`, `LanguageToggle.tsx`, `SiteHeader.tsx`

For each file: open it, scan visually for any English string that would be visible to a Taiwanese viewer. If found, add the key to both message bundles and migrate the call site. Commit the fix as `fix(i18n): translate <component> <surface>`.

Common false positives to skip: hex codes, CSS unit values (`px`, `vw`, `cm`, `'9"`), file paths, ARIA roles, `aria-hidden`, dev-only debug strings behind `?calibrate=*` or `?tune=*`.

- [ ] **Step 2: Verify the missing-key fallback**

Temporarily edit `src/i18n/messages/zh-TW.json`: delete the entire `home.brandStory` block. Save.

Open `http://localhost:3000` in 中 mode (toggle if needed). Confirm:
- The brand story section renders the **English** copy (because the keys aren't in zh-TW.json).
- No console error fatals.
- The rest of the home page still renders in Chinese.

Restore `home.brandStory` in `zh-TW.json`. Reload — the section is back in Chinese.

- [ ] **Step 3: Mobile QA**

Open DevTools → Device toolbar. Pick iPhone SE (375×667).

- Header: language toggle is fully visible top-right, doesn't overlap the centered logo, doesn't get cut off by the iOS safe-area inset.
- Sub-nav: links scroll horizontally cleanly in both languages (Chinese labels are 2-3 characters wide so the scroll bar may not actually trigger; verify there's no wrap).
- Customize: section headings, color swatches, embroidery controls all readable; no layout overflow.
- Shop: region cards stack one per row at this width; CTA `前往當地門市 →` reads completely.
- ShareDock: toast `連結已複製 — 請貼到 Instagram。` doesn't overflow off the left edge of the viewport.

- [ ] **Step 4: Final lint/tsc baseline confirmation**

```bash
npx tsc --noEmit
npm run lint
```

Expected:
- `tsc` exits 0.
- `npm run lint` reports exactly **4 errors + 1 warning** in the documented pre-existing files (`PngOverlayLayer.tsx`, `SizeVisualizer.tsx`, `customize/page.tsx`, `invoice/page.tsx`). If a new error has appeared in any file you touched, fix it before proceeding.

- [ ] **Step 5: Update TESTING.md**

Read `TESTING.md`. Add a new section under "What to eyeball":

```markdown
### Language toggle (every page except `/invoice`)

- Top-right pill in the header reads `EN` (active) and `中`.
- Click `中`: page reloads. All site chrome (nav, footer, share dock toast), home copy, gallery section header, customize tool, and shop page render in Traditional Chinese.
- Click `EN`: returns to English.
- Cookie `NEXT_LOCALE` persists across browser sessions.
- `/gallery` ad rail in EN shows `EN-*.png` files; in 中 shows `TW-*.png` files. Drop a new `EN-/TW-` pair into `public/advertisement/` to add a slide — no code change needed.
- `/invoice` always renders English regardless of cookie value (out of scope for this delivery).
- Mobile (375px): toggle is reachable, doesn't overlap logo or safe-area chrome.
```

Update the "Recent commits live" block at the top of `TESTING.md` to include the i18n commits when they land on the deploy.

- [ ] **Step 6: Commit polish + TESTING.md update**

```bash
git add TESTING.md
# plus any audit fixes from Step 1
git commit -m "$(cat <<'EOF'
chore(i18n): post-migration polish + TESTING.md update

Adds the language-toggle smoke test section to TESTING.md and resolves
any hardcoded strings caught during the final audit pass.
EOF
)"
```

---

## Summary of Commits

After all nine tasks land, the branch carries:

1. `feat(i18n): install next-intl and wire root layout for locale read`
2. `feat(i18n): top-right language toggle in SiteHeader`
3. `feat(i18n): translate site chrome (nav, footer, intro, share dock)`
4. `feat(i18n): translate home page (hero, brand story, why-this-bag)`
5. `feat(i18n): translate gallery section header, Coming Soon card, size visualizer eyebrow`
6. `feat(i18n): auto-discover ad images from public/advertisement/ by locale prefix`
7. `feat(i18n): translate shop page (heading, region taglines, CTA)`
8. `feat(i18n): translate customize tool (colors, embroidery, summary, parts)`
9. `chore(i18n): post-migration polish + TESTING.md update` (plus any audit fixes)

The branch is ready for review and deploy. After merge, the user toggles language in the top-right corner; everything in scope flips between English and Traditional Chinese.
