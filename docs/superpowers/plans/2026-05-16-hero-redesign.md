# Hero Redesign — Peak Design Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the homepage to match the approved Peak Design-style mockup: full-bleed bag animation hero with floating text + buttons, hamburger drawer replacing SubNav, and #333333 replacing pure black throughout.

**Architecture:** A new `HamburgerDrawer` component handles slide-in nav globally inside `SiteHeader`. The homepage hero becomes a `position: relative` container with `HeroBagVisual` as an absolute full-bleed layer and a centered overlay for text + CTAs. `IntroVideo` is removed — the animation lives in the hero now.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, inline styles (no Tailwind on these components), existing ThemeContext.

---

## File Map

| File | Change |
|------|--------|
| `src/components/HamburgerDrawer.tsx` | **Create** — slide-in nav drawer |
| `src/components/SiteHeader.tsx` | **Modify** — add hamburger left, move theme toggle right, remove SubNav |
| `src/app/page.tsx` | **Modify** — full-bleed hero, remove IntroVideo, add CTAs, anchor BrandStory |
| `src/i18n/messages/en.json` | **Modify** — add hero.shopNow, hero.learnMore |
| `src/i18n/messages/zh-TW.json` | **Modify** — same keys in Chinese |

`SubNav.tsx` is not deleted (other code may import it during transition), but it is no longer rendered by SiteHeader.

---

## Task 1: Add i18n keys for hero CTA buttons

**Files:**
- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/zh-TW.json`

- [ ] **Step 1: Add keys to en.json**

Open `src/i18n/messages/en.json`. Find the `"home"` → `"hero"` object (currently around line 74–78) and add two keys:

```json
"hero": {
  "tagline": "Built for the way you carry.",
  "subline": "Modern everyday backpacks engineered for durability, designed without compromise.",
  "shopNow": "Shop Now",
  "learnMore": "Learn More"
},
```

- [ ] **Step 2: Add keys to zh-TW.json**

Open `src/i18n/messages/zh-TW.json`. Find the same `"home"` → `"hero"` object and add:

```json
"hero": {
  "tagline": "為你的方式而生。",
  "subline": "專為日常設計的後背包，耐用、不妥協。",
  "shopNow": "立即選購",
  "learnMore": "了解更多"
},
```

- [ ] **Step 3: Verify the dev server still starts**

```bash
npm run dev
```

Expected: No i18n errors in terminal. Visit `http://localhost:3000` — page loads (hero looks unchanged for now).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/en.json src/i18n/messages/zh-TW.json
git commit -m "feat: add hero CTA i18n keys (shopNow, learnMore)"
```

---

## Task 2: Create HamburgerDrawer component

**Files:**
- Create: `src/components/HamburgerDrawer.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function HamburgerDrawer({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  const links = [
    { href: "/", label: t("home") },
    { href: "/gallery", label: t("lookbook") },
    { href: "/customize", label: t("customize") },
    { href: "/studio", label: t("studio") },
    { href: "/shop", label: t("shop") },
  ];

  return (
    <>
      {/* Overlay — click to close */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: "rgba(0,0,0,0.45)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 280ms ease",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(80vw, 300px)",
          zIndex: 91,
          background: isLight ? "#fff" : "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isOpen ? "4px 0 32px rgba(0,0,0,0.18)" : "none",
        }}
      >
        {/* Drawer header: logo + close */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: isLight ? "1px solid #f0f0f0" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.png"
            alt="Computex Systems"
            style={{
              height: 40,
              objectFit: "contain",
              filter: isLight ? "brightness(0)" : undefined,
            }}
          />
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 24,
              lineHeight: 1,
              color: isLight ? "#333" : "rgba(255,255,255,0.7)",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1 }}>
          {links.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href) ?? false;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: active
                    ? (isLight ? "#333" : "#fff")
                    : (isLight ? "rgba(51,51,51,0.5)" : "rgba(255,255,255,0.5)"),
                  borderBottom: isLight ? "1px solid #f0f0f0" : "1px solid rgba(255,255,255,0.06)",
                  textDecoration: "none",
                  letterSpacing: 0.2,
                  transition: "color 160ms ease",
                }}
              >
                {link.label}
                <span style={{ color: isLight ? "#ccc" : "rgba(255,255,255,0.2)", fontSize: 16 }}>›</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: language + theme toggle */}
        <div
          style={{
            padding: 20,
            borderTop: isLight ? "1px solid #f0f0f0" : "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: isLight ? "rgba(51,51,51,0.6)" : "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HamburgerDrawer.tsx
git commit -m "feat: add HamburgerDrawer slide-in nav component"
```

---

## Task 3: Update SiteHeader — hamburger left, theme toggle right, no SubNav

**Files:**
- Modify: `src/components/SiteHeader.tsx`

Current structure: theme toggle left | logo center | language+currency right. SubNav rendered below.

New structure: hamburger left | logo center | theme toggle + language+currency right. No SubNav.

- [ ] **Step 1: Replace SiteHeader.tsx entirely**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageToggle from "./LanguageToggle";
import CurrencySelector from "./CurrencySelector";
import HamburgerDrawer from "./HamburgerDrawer";
import { useTheme } from "@/lib/ThemeContext";

const LOGO_SRC = "/logo/logo.png";

type Props = {
  invert?: boolean;
};

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function SiteHeader({ invert: invertProp }: Props) {
  const t = useTranslations("header");
  const { theme, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLight = invertProp !== undefined ? invertProp : theme === "light";

  const backdrop = isLight ? "rgba(255,255,255,0.7)" : "rgba(20,20,20,0.55)";
  const borderBottom = isLight
    ? "1px solid rgba(0,0,0,0.08)"
    : "1px solid rgba(255,255,255,0.08)";
  const iconColor = isLight ? "rgba(51,51,51,0.7)" : "rgba(255,255,255,0.6)";

  return (
    <>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          width: "100vw",
        }}
      >
        <header
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            paddingTop: "max(14px, env(safe-area-inset-top))",
            paddingBottom: 14,
            paddingLeft: "max(20px, env(safe-area-inset-left))",
            paddingRight: "max(20px, env(safe-area-inset-right))",
            background: backdrop,
            backdropFilter: "blur(16px) saturate(160%)",
            WebkitBackdropFilter: "blur(16px) saturate(160%)",
            borderBottom,
          }}
        >
          {/* Left: hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              justifySelf: "start",
            }}
          >
            <span style={{ display: "block", width: 22, height: 1.5, background: isLight ? "#333" : "rgba(255,255,255,0.8)" }} />
            <span style={{ display: "block", width: 22, height: 1.5, background: isLight ? "#333" : "rgba(255,255,255,0.8)" }} />
            <span style={{ display: "block", width: 22, height: 1.5, background: isLight ? "#333" : "rgba(255,255,255,0.8)" }} />
          </button>

          {/* Centre: logo */}
          <Link
            href="/"
            aria-label={t("homeAriaLabel")}
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Computex Systems"
              style={{
                height: 56,
                objectFit: "contain",
                filter: isLight ? "brightness(0)" : undefined,
              }}
            />
          </Link>

          {/* Right: theme toggle + language + currency */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifySelf: "end",
            }}
          >
            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 8,
                color: iconColor,
                display: "flex",
                alignItems: "center",
                transition: "color 0.3s ease",
              }}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 88 }}>
              <LanguageToggle />
              <CurrencySelector invert={isLight} />
            </div>
          </div>
        </header>
      </div>

      <HamburgerDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If you see `showSubNav` prop errors on call sites, ignore — those pages pass no props to SiteHeader so they're unaffected. The prop is simply removed from the type.

- [ ] **Step 3: Visual check**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Three-line hamburger appears top-left
- Logo centered
- Theme toggle + language/currency top-right
- SubNav bar is gone
- Clicking ☰ opens the drawer from the left
- Clicking overlay or × closes it
- Theme toggle in drawer works

- [ ] **Step 4: Commit**

```bash
git add src/components/SiteHeader.tsx
git commit -m "feat: replace SubNav with hamburger drawer in SiteHeader"
```

---

## Task 4: Redesign homepage hero — full-bleed animation with floating CTAs

**Files:**
- Modify: `src/app/page.tsx`

The hero changes from a vertically stacked section (text above, bag below) to a full-bleed container where `HeroBagVisual` is an absolute background layer and all text + buttons float centered over it.

- [ ] **Step 1: Replace page.tsx entirely**

```tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroBagVisual from "@/components/HeroBagVisual";
import FeatureExpandableCard, {
  type FeatureCardData,
} from "@/components/FeatureExpandableCard";
import BrandStory from "@/components/BrandStory";
import ArrowIcon from "@/components/ArrowIcon";
import { useTheme } from "@/lib/ThemeContext";

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
};

export default function HomePage() {
  const t = useTranslations("home");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pageBg: React.CSSProperties = {
    minHeight: "100vh",
    backgroundImage: isDark
      ? "linear-gradient(#555555, #222222)"
      : "linear-gradient(#ffffff, #FDFAF3)",
    backgroundAttachment: "fixed",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 0 48px",
    gap: 48,
    color: isDark ? "#fff" : "#333",
    transition: "color 0.5s ease",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
    margin: "0 0 24px",
    color: isDark ? "#fff" : "#333",
    transition: "color 0.5s ease",
  };

  // Hero warm bg — same in both modes so the bag animation reads clearly
  const heroWarmBg = isDark
    ? "linear-gradient(145deg, #2a2520 0%, #1e1c18 50%, #232118 100%)"
    : "linear-gradient(145deg, #e8e4db 0%, #ede9e0 35%, #edeae3 65%, #e9e5dc 100%)";

  const eyebrowColor = isDark ? "rgba(255,255,255,0.38)" : "rgba(51,51,51,0.45)";
  const titleColor = isDark ? "#f0f0ee" : "#333";
  const subColor = isDark ? "rgba(255,255,255,0.48)" : "rgba(51,51,51,0.48)";

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
    {
      title: t("whyThisBag.design.title"),
      summary: t("whyThisBag.design.summary"),
      items: [
        {
          videoSrc: "/gif/Reinforced Laptop Compartment.mp4",
          title: t("whyThisBag.design.laptopCompartment.title"),
          description: t("whyThisBag.design.laptopCompartment.description"),
        },
        {
          videoSrc: "/gif/Super Breathable Straps Padding.mp4",
          title: t("whyThisBag.design.breathableStraps.title"),
          description: t("whyThisBag.design.breathableStraps.description"),
        },
      ],
    },
    {
      title: t("whyThisBag.quality.title"),
      summary: t("whyThisBag.quality.summary"),
      items: [
        {
          videoSrc: "/gif/Shockproof Foam Armor.mp4",
          title: t("whyThisBag.quality.shockproofFoam.title"),
          description: t("whyThisBag.quality.shockproofFoam.description"),
        },
        {
          videoSrc: "/gif/Water-Resistant Material.mp4",
          title: t("whyThisBag.quality.waterResistant.title"),
          description: t("whyThisBag.quality.waterResistant.description"),
        },
      ],
    },
  ];

  return (
    <main style={pageBg}>
      <SiteHeader />

      {/* HERO — full-bleed animation, content centered over it */}
      <section
        style={{
          position: "relative",
          width: "100%",
          height: 600,
          overflow: "hidden",
          backgroundImage: heroWarmBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: -48, // pull up to sit flush under sticky header
        }}
      >
        {/* Bag animation — oversized so it bleeds past all 4 edges */}
        <div
          style={{
            position: "absolute",
            inset: "-10%",
            width: "120%",
            height: "120%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <HeroBagVisual />
        </div>

        {/* Floating content — no card or frame */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "0 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 3,
              color: eyebrowColor,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Designed in Taiwan
          </p>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1.06,
              color: titleColor,
              letterSpacing: -1.5,
              margin: 0,
              marginBottom: 16,
              transition: "color 0.5s ease",
            }}
          >
            {t("hero.tagline")}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: subColor,
              lineHeight: 1.65,
              maxWidth: 260,
              marginBottom: 36,
              transition: "color 0.5s ease",
            }}
          >
            {t("hero.subline")}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                background: isDark ? "#f0f0ee" : "#333",
                color: isDark ? "#333" : "#fff",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                textDecoration: "none",
                transition: "background 0.3s ease, color 0.3s ease",
                whiteSpace: "nowrap",
              }}
            >
              {t("hero.shopNow")}
              <ArrowIcon size={14} />
            </Link>
            <a
              href="#brand-story"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                background: "transparent",
                color: isDark ? "rgba(240,240,238,0.85)" : "#333",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                border: isDark ? "1.5px solid rgba(255,255,255,0.3)" : "1.5px solid rgba(51,51,51,0.3)",
                borderRadius: 6,
                cursor: "pointer",
                textDecoration: "none",
                transition: "color 0.3s ease, border-color 0.3s ease",
                whiteSpace: "nowrap",
              }}
            >
              {t("hero.learnMore")}
            </a>
          </div>
        </div>
      </section>

      {/* BRAND STORY — anchor for "Learn More" */}
      <div id="brand-story" style={{ width: "100%", padding: "0 24px" }}>
        <BrandStory />
      </div>

      {/* VALUE PILLARS */}
      <section style={{ ...sectionStyle, padding: "0 24px" }}>
        <h2 style={sectionHeaderStyle}>{t("whyThisBag.heading")}</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {FEATURE_CARDS.map((card) => (
            <FeatureExpandableCard key={card.title} data={card} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Visual check in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Hero spans full width, ~600px tall
- Bag animation fills the entire hero area — visible top, bottom, left, right
- Eyebrow "Designed in Taiwan", h1 tagline, subline, and two buttons all float centered over the animation — no card or background box around them
- "Shop Now" (filled dark button with arrow) and "Learn More" (outlined button) sit side by side
- Clicking "Shop Now" navigates to `/shop`
- Clicking "Learn More" smoothly scrolls to the brand story section
- Toggle dark mode — hero shifts to dark warm gradient, text colors adapt
- `<IntroVideo />` is gone — no intro animation plays on first load
- BrandStory and value pillars still render below

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: full-bleed hero with floating CTAs, remove IntroVideo"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Hamburger replaces SubNav globally → Task 3 (SiteHeader) + Task 2 (HamburgerDrawer)
- ✅ Theme toggle moves to right → Task 3
- ✅ Full-bleed HeroBagVisual hero → Task 4
- ✅ Eyebrow + tagline + subline + two CTAs floating over animation → Task 4
- ✅ Shop Now → /shop → Task 4
- ✅ Learn More → scrolls to #brand-story → Task 4
- ✅ #333 instead of pure black → SiteHeader (Task 3), page.tsx (Task 4), HamburgerDrawer (Task 2)
- ✅ IntroVideo removed → Task 4
- ✅ i18n keys for new buttons → Task 1
- ✅ Dark mode support throughout → all tasks

**Placeholder scan:** No TBDs, no "add appropriate" language, all code blocks complete.

**Type consistency:**
- `HamburgerDrawer` props: `isOpen: boolean, onClose: () => void` — used identically in Task 2 (definition) and Task 3 (usage in SiteHeader).
- `t("hero.shopNow")` and `t("hero.learnMore")` — keys added in Task 1, consumed in Task 4.
