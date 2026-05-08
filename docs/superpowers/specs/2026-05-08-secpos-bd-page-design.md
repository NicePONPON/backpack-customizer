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

### 2. Product Tier Chart ("Building Floors")

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

### 3. Contact Card

- Triggered by scrolling past the product floors
- Background transitions from near-black (`#0d0d1a`) to soft white (`#f8f8fc`) via CSS scroll-driven animation (`animation-timeline: scroll()`) — gradual, not abrupt
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

## Out of Scope

- Analytics / tracking
- Contact form (email link is sufficient)
- Multi-language (EN only for now)
- Mobile app deep links
- CMS or editable content layer
