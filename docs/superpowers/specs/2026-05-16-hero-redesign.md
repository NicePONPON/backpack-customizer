# Hero Redesign — Peak Design Style

## Goal

Redesign the homepage hero so the bag animation fills the entire hero as a full-bleed background (like a video), with the eyebrow, tagline, subline, and two CTA buttons floating freely centered over it — no card or frame. Replace SubNav with a hamburger drawer globally. Use #333333 instead of pure black throughout.

## Architecture

Three changes work together: (1) `SiteHeader` gains a hamburger button + slide-out drawer and loses the SubNav; (2) the homepage hero is restructured so `HeroBagVisual` becomes an absolute full-bleed layer with text and buttons overlaid; (3) color tokens shift from #111/#000 to #333.

## Changes

### 1. SiteHeader — hamburger replaces SubNav

- Move the theme toggle from the left column to the right column (beside EN / currency).
- Replace the left column with a hamburger button (three lines, `#333`).
- Add a new `HamburgerDrawer` component rendered inside SiteHeader (covers full viewport height via `position: fixed`).
- Drawer slides in from the left. Contains: logo at top, nav links (Home / Lookbook / Customize / Studio / Shop), EN/中 + theme toggle at bottom.
- Clicking the overlay or × closes the drawer.
- `showSubNav` prop and `<SubNav>` are removed from SiteHeader entirely — SubNav is no longer used on any page.
- All other pages that pass `showSubNav` should have that prop removed (it's gone).

### 2. Homepage hero — full-bleed animation with floating content

In `src/app/page.tsx`:

- The hero wrapper becomes `position: relative; overflow: hidden` with a fixed height (e.g., `100svh` minus header height, or a set px like `600px`).
- `HeroBagVisual` moves inside an `position: absolute; inset: -10%; width: 120%; height: 120%` container so it bleeds past all four edges — no background visible at the edges.
- An overlay `div` with `position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center` holds the text content.
- Order inside overlay: eyebrow (`"Designed in Taiwan"`), `<h1>` tagline, subline `<p>`, then two buttons side by side.
- **Shop Now** button → links to `/shop`. Style: filled `#333` background, white text, `border-radius: 6px`, uppercase, `letter-spacing: 1.5px`.
- **Learn More** button → scrolls to the `#brand-story` section below (or the existing BrandStory component). Style: transparent background, `#333` text, `1.5px solid rgba(51,51,51,0.3)` border, same radius/size.
- The existing "Why This Bag" section and BrandStory section below the hero remain unchanged — just give BrandStory an `id="brand-story"` anchor.
- Remove the separate intro animation page/component if it exists — the animation now lives in the hero.

### 3. Color: #333333 everywhere pure black was used

Audit `page.tsx`, `SiteHeader.tsx`, and the new `HamburgerDrawer` component:
- Replace `#111`, `#000`, `rgba(0,0,0,1)` used for text/borders/icons with `#333`.
- Opacity-based colors like `rgba(0,0,0,0.45)` → `rgba(51,51,51,0.45)`.
- Do not change `box-shadow` rgba values or overlay backdrop rgba values — those are fine as-is.

## New Component

`src/components/HamburgerDrawer.tsx` — controlled by `isOpen` / `onClose` props. Renders a fixed overlay + slide-in panel. Uses `next-intl` for nav link labels (same keys as SubNav). Uses `usePathname()` for active state. No external animation library needed — CSS `transform: translateX` transition is sufficient.

## Out of Scope

- No changes to `/customize`, `/studio`, `/gallery`, `/invoice` page layouts.
- No changes to `HeroBagVisual` internals.
- No changes to pricing, auth, or database logic.
