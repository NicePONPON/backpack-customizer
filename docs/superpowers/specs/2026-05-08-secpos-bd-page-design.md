# SECPOS BD Landing Page — Design Spec

**Date:** 2026-05-08
**Owner:** Chris Chen (chris.chen@sofone.ai)
**Purpose:** A standalone static website (separate GitHub repo) serving as a business development landing page for SECPOS sales conversations. The page presents the product portfolio mapped to chain store scale tiers, then reveals Chris's contact info on scroll.

---

## Overview

Single-page static site: `index.html` + `style.css` + logo assets. No framework, no build step. Hosted on Vercel via a new GitHub repo. Bold gradient visual style (deep indigo → vivid violet).

---

## Sections

### 1. Hero

- Full-viewport height (`100vh`)
- Background gradient: `#1a1a4e` → `#7c3aed` (top to bottom)
- Centered content:
  - SECPOS logo (user-supplied image)
  - Headline: *"AI-Powered Solutions for F&B Chains"*
  - Sub-headline: *"Software · Hardware · Scale"*
  - Animated down-arrow (CSS keyframe, no bounce) nudging scroll
- No navigation bar — single scroll flow

### 2. Brand Story (Scroll-Fade Paragraphs)

Inspired by the backpack-customizer `BrandStory.tsx` component. Each paragraph's text color is driven by its distance from the viewport vertical center — paragraphs in focus are near-white (`rgba(255,255,255,0.92)`), paragraphs out of focus fade to dim (`rgba(255,255,255,0.22)`). Uses exponential decay: `opacity = 0.22 + 0.70 * exp(-dist / 160)`. Implemented in vanilla JS with a `scroll` event listener (passive).

**Content breakdown (6 scroll beats):**

| # | Weight | Text |
|---|--------|------|
| 1 | Regular | SECPOS 碩豐數位科技 是一家專注於 智慧商用設備、SaaS 應用與 AI 數據營運 的科技企業，致力於打造可跨國部署的智慧商業技術平台。 |
| 2 | Regular | 公司以 軟硬整合能力 為核心，服務涵蓋 IoT 設備管理、餐飲零售中台、商用系統整合與 POS 終端應用，協助企業加速營運數位化與智慧化。 |
| 3 | **Bold** | 碩豐提供的不僅是產品，而是一套從設備、系統到數據的全生命週期整合能力（End-to-End Value Chain）服務商。 |
| 4 | Regular | 透過自研平台與模組化架構，我們為餐飲、零售與商用設備製造商提供可快速複製、可規模化擴展、可全球化運行的數位解決方案。 |
| 5 | Medium · spaced | IoT 設備管理  ·  餐飲零售中台  ·  商用系統整合 |
| 6 | Small caps label | SECPOS 碩豐數位科技 — END-TO-END VALUE CHAIN |

- Section background: dark (`#0d0d2e`) — matches hero gradient end, flows naturally
- Gradient headline above the beats: white→grey vertical gradient text (matches backpack headline style)
- Label above headline: small-caps eyebrow e.g. "OUR STORY"
- Section has generous vertical padding so paragraphs are well-spaced for the scroll effect

### 3. Product Tier Chart ("Building Floors")

Vertical skyscraper cross-section layout. Each floor = one chain scale tier. Floor height is proportional to tier breadth. Products sit inside their floor with logo + name + CTA link.

| Floor | Scale label | Product(s) | URL |
|-------|-------------|------------|-----|
| Top | Global chains | autopos | https://autopos.tw/ |
| Mid-high | National mid–large | vivipos | *(no URL — shows "Contact us" CTA)* |
| Mid | All scales | Nubis / Nubis Cast | https://centrdx.shop/ |
| Ground | Single / small shop | CENTRDX | https://centrdx.shop/ |
| Basement | Cross-tier ISO training | IMSDOM | https://www.imsdom.com/ |

- Each product card: logo `<img>` (placeholder `alt` text until logos dropped in), product name, scale descriptor, link button
- Links open in `target="_blank" rel="noopener"`
- vivipos CTA scrolls to contact section instead of external URL
- Floor dividers use semi-transparent white lines on the gradient background
- Building frame has a subtle box-shadow to read as a 3-D structure

### 4. Contact Card

- Triggered by scrolling past the product floors
- Background transitions from near-black (`#0d0d1a`) to soft white (`#f8f8fc`) as user scrolls into the section — implemented via JS `IntersectionObserver` + CSS class toggle (not `animation-timeline: scroll()`, which is unsupported in Safari)
- Contact card centered, white background, rounded corners, subtle shadow
- Contents:
  - Name: **Chris Chen 陳泓宇**
  - Title: Sales Manager
  - Company: **SECPOS 碩豐科技**
  - Mobile: 0933-857-545 (tappable `tel:+886933857545`)
  - Email: chris.chen@sofone.ai (tappable `mailto:`)
  - Address: 221 新北市汐止區文化里新台五路一段75號11樓之4

---

## Visual Style

- **Gradient:** `#1a1a4e` → `#7c3aed` in the hero; floors section continues on dark background; contact fades to near-white
- **Typography:** System font stack for zero load time (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`); bold weight for product names, regular for descriptors
- **Motion:** Premium minimal — smooth easing, no bounce, restrained amplitudes. Scroll fade uses `opacity` + `transform: translateY` (not blur)
- **Color accents:** Violet `#7c3aed` for CTA buttons; white/10% translucent for floor dividers

---

## File Structure (new repo)

```
secpos-bd/
├── index.html        # all markup
├── style.css         # all styles + animations
└── assets/
    ├── secpos-logo.png       # placeholder — user supplies
    ├── autopos-logo.png
    ├── vivipos-logo.png
    ├── nubis-logo.png
    ├── nubis-cast-logo.png
    ├── centrdx-logo.png
    └── imsdom-logo.png
```

---

## Deployment

1. Create new GitHub repo: `secpos-bd`
2. Push `index.html` + `style.css` + `assets/`
3. Import repo into Vercel → auto-deploy (static, no build command needed)
4. Optional: set custom domain in Vercel project settings

---

## Mobile-First Requirements

The page will be shared via NFC business card — the majority of visitors arrive on a phone. All design decisions are mobile-first:

- Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- Hero text sized for mobile (`clamp()` fluid type scale)
- Building floors stack vertically as single-column cards on screens < 480px
- Product logos sized to render clearly at 80–120px on mobile
- Contact info uses large tap targets (min 44px height) for phone/email links
- No hover-only interactions — all CTAs work on touch
- Page tested at 375px (iPhone SE) and 390px (iPhone 14) widths

## Out of Scope

- Analytics / tracking
- Contact form (email link is sufficient)
- Multi-language (EN only for now)
- Mobile app deep links
- CMS or editable content layer
