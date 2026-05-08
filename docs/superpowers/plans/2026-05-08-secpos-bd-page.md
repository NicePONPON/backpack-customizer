# SECPOS BD Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first static HTML/CSS/JS landing page for SECPOS 碩豐科技 that showcases the product tier portfolio and Chris Chen's contact info, deployed to Vercel via GitHub.

**Architecture:** Single `index.html` + `style.css` with inline `<script>` for scroll effects. Four sections: Hero → Brand Story (scroll-fade paragraphs) → Product Tiers (building floors) → Contact Card. No framework, no build step.

**Tech Stack:** Plain HTML5, CSS3 (custom properties, clamp(), IntersectionObserver), vanilla JS scroll listener. Hosted on Vercel (static). New GitHub repo: `secpos-bd`.

---

## File Structure

```
secpos-bd/
├── index.html      ← all markup + inline <script>
├── style.css       ← all styles (CSS custom props, mobile-first)
└── assets/
    ├── placeholder.svg        ← generic logo placeholder (created in Task 1)
    ├── secpos-logo.png        ← drop in real logo (referenced but may 404 gracefully)
    ├── autopos-logo.png
    ├── vivipos-logo.png
    ├── nubis-logo.png
    ├── nubis-cast-logo.png
    ├── centrdx-logo.png
    └── imsdom-logo.png
```

---

## Task 1: Initialize repo and folder structure

**Files:**
- Create: `secpos-bd/` (new directory, outside backpack-customizer)
- Create: `secpos-bd/assets/placeholder.svg`
- Create: `secpos-bd/index.html` (empty skeleton)
- Create: `secpos-bd/style.css` (empty)

- [ ] **Step 1: Create the directory and git init**

```bash
mkdir ~/secpos-bd && cd ~/secpos-bd
git init
mkdir assets
```

- [ ] **Step 2: Create the placeholder SVG logo**

Create `assets/placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="12" fill="rgba(255,255,255,0.12)"/>
  <text x="40" y="46" text-anchor="middle" font-family="system-ui" font-size="22"
        font-weight="700" fill="rgba(255,255,255,0.5)">?</text>
</svg>
```

- [ ] **Step 3: Create empty index.html**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SECPOS 碩豐科技</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- sections go here -->
</body>
</html>
```

- [ ] **Step 4: Create empty style.css**

Create `style.css`:

```css
/* SECPOS BD Page */
```

- [ ] **Step 5: Open in browser to verify blank page loads**

```bash
open index.html
```

Expected: blank white page with no console errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: init secpos-bd project structure"
```

---

## Task 2: HTML skeleton — all four sections

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace index.html body with the full four-section skeleton**

Replace the `<body>` content in `index.html` with:

```html
<body>

  <!-- ── 1. Hero ─────────────────────────────────── -->
  <section class="hero">
    <div class="hero-inner">
      <img src="assets/secpos-logo.png" alt="SECPOS"
           class="hero-logo"
           onerror="this.src='assets/placeholder.svg'">
      <h1 class="hero-headline">AI-Powered Solutions<br>for F&amp;B Chains</h1>
      <p class="hero-sub">Software · Hardware · Scale</p>
    </div>
    <div class="scroll-hint" aria-hidden="true">
      <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
        <line x1="12" y1="0" x2="12" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/>
        <polyline points="6,14 12,22 18,14" stroke="white" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </div>
  </section>

  <!-- ── 2. Brand Story ──────────────────────────── -->
  <section class="story">
    <div class="story-inner">
      <p class="story-eyebrow">OUR STORY</p>
      <h2 class="story-headline">智慧商業，全球佈局</h2>

      <div class="story-beats">
        <p class="beat" data-beat="0">
          SECPOS 碩豐數位科技 是一家專注於 智慧商用設備、SaaS 應用與 AI 數據營運 的科技企業，致力於打造可跨國部署的智慧商業技術平台。
        </p>
        <p class="beat" data-beat="1">
          公司以 軟硬整合能力 為核心，服務涵蓋 IoT 設備管理、餐飲零售中台、商用系統整合與 POS 終端應用，協助企業加速營運數位化與智慧化。
        </p>
        <p class="beat beat--bold" data-beat="2">
          碩豐提供的不僅是產品，而是一套從設備、系統到數據的全生命週期整合能力（End-to-End Value Chain）服務商。
        </p>
        <p class="beat" data-beat="3">
          透過自研平台與模組化架構，我們為餐飲、零售與商用設備製造商提供可快速複製、可規模化擴展、可全球化運行的數位解決方案。
        </p>
        <p class="beat beat--pillars" data-beat="4">
          IoT 設備管理&nbsp;&nbsp;·&nbsp;&nbsp;餐飲零售中台&nbsp;&nbsp;·&nbsp;&nbsp;商用系統整合
        </p>
        <p class="beat beat--label" data-beat="5">
          SECPOS 碩豐數位科技 — END-TO-END VALUE CHAIN
        </p>
      </div>
    </div>
  </section>

  <!-- ── 3. Product Tiers ────────────────────────── -->
  <section class="tiers">
    <h2 class="tiers-heading">Our Solutions</h2>
    <div class="building" role="list">

      <div class="floor" role="listitem">
        <div class="floor-scale">Medium → Global Chains</div>
        <div class="floor-products">
          <div class="product-card">
            <img src="assets/autopos-logo.png" alt="autopos"
                 class="product-logo" onerror="this.src='assets/placeholder.svg'">
            <span class="product-name">autopos</span>
            <a href="https://autopos.tw/" target="_blank" rel="noopener noreferrer"
               class="cta-btn">Learn more</a>
          </div>
        </div>
      </div>

      <div class="floor" role="listitem">
        <div class="floor-scale">National Mid–Large Chains</div>
        <div class="floor-products">
          <div class="product-card">
            <img src="assets/vivipos-logo.png" alt="vivipos"
                 class="product-logo" onerror="this.src='assets/placeholder.svg'">
            <span class="product-name">vivipos</span>
            <a href="#contact" class="cta-btn">Contact us</a>
          </div>
        </div>
      </div>

      <div class="floor" role="listitem">
        <div class="floor-scale">All Scales</div>
        <div class="floor-products floor-products--pair">
          <div class="product-card">
            <img src="assets/nubis-logo.png" alt="Nubis"
                 class="product-logo" onerror="this.src='assets/placeholder.svg'">
            <span class="product-name">Nubis</span>
            <a href="https://centrdx.shop/" target="_blank" rel="noopener noreferrer"
               class="cta-btn">Learn more</a>
          </div>
          <div class="product-card">
            <img src="assets/nubis-cast-logo.png" alt="Nubis Cast"
                 class="product-logo" onerror="this.src='assets/placeholder.svg'">
            <span class="product-name">Nubis Cast</span>
            <a href="https://centrdx.shop/" target="_blank" rel="noopener noreferrer"
               class="cta-btn">Learn more</a>
          </div>
        </div>
      </div>

      <div class="floor" role="listitem">
        <div class="floor-scale">Single / Small Shop</div>
        <div class="floor-products">
          <div class="product-card">
            <img src="assets/centrdx-logo.png" alt="CENTRDX"
                 class="product-logo" onerror="this.src='assets/placeholder.svg'">
            <span class="product-name">CENTRDX</span>
            <a href="https://centrdx.shop/" target="_blank" rel="noopener noreferrer"
               class="cta-btn">Learn more</a>
          </div>
        </div>
      </div>

      <div class="floor floor--training" role="listitem">
        <div class="floor-scale">Global ISO Training (Cross-tier)</div>
        <div class="floor-products">
          <div class="product-card">
            <img src="assets/imsdom-logo.png" alt="IMSDOM"
                 class="product-logo" onerror="this.src='assets/placeholder.svg'">
            <span class="product-name">IMSDOM</span>
            <a href="https://www.imsdom.com/" target="_blank" rel="noopener noreferrer"
               class="cta-btn">Learn more</a>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- ── 4. Contact ──────────────────────────────── -->
  <section class="contact-section" id="contact">
    <div class="contact-card">
      <p class="contact-name">Chris Chen 陳泓宇</p>
      <p class="contact-title">Sales Manager</p>
      <p class="contact-company">SECPOS 碩豐科技</p>
      <a href="tel:+886933857545" class="contact-link">0933-857-545</a>
      <a href="mailto:chris.chen@sofone.ai" class="contact-link">chris.chen@sofone.ai</a>
      <p class="contact-address">221 新北市汐止區文化里<br>新台五路一段75號11樓之4</p>
    </div>
  </section>

  <script>
    /* ── Brand Story scroll-fade ───────────────────────────────────── */
    const OPACITY_MAX = 0.92;
    const OPACITY_MIN = 0.22;
    const DECAY_SCALE = 160; // px — lower = steeper falloff

    function distToOpacity(dist) {
      return OPACITY_MIN + (OPACITY_MAX - OPACITY_MIN) * Math.exp(-dist / DECAY_SCALE);
    }

    const beats = Array.from(document.querySelectorAll('.beat'));

    function updateBeatOpacities() {
      const vpCenter = window.innerHeight / 2;
      beats.forEach(function(el) {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - vpCenter);
        const alpha = distToOpacity(dist);
        el.style.color = 'rgba(255,255,255,' + alpha + ')';
      });
    }

    window.addEventListener('scroll', updateBeatOpacities, { passive: true });
    updateBeatOpacities();

    /* ── Contact section reveal ────────────────────────────────────── */
    const contactSection = document.querySelector('.contact-section');

    const revealObserver = new IntersectionObserver(
      function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            contactSection.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.2 }
    );

    revealObserver.observe(contactSection);
  </script>

</body>
```

- [ ] **Step 2: Open in browser and verify all four sections render**

```bash
open index.html
```

Expected: four sections visible (unstyled), no JS console errors. Scroll to bottom — contact section present.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add full four-section HTML skeleton"
```

---

## Task 3: CSS — reset, custom properties, hero section

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Write reset + custom properties + hero CSS**

Replace `style.css` with:

```css
/* ── Reset ──────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Custom properties ──────────────────────────────────── */
:root {
  --c-top:       #1a1a4e;
  --c-mid:       #0d0d2e;
  --c-violet:    #7c3aed;
  --c-white:     #ffffff;
  --c-contact:   #f8f8fc;
  --floor-sep:   rgba(255, 255, 255, 0.14);
  --radius-card: 12px;
  --radius-btn:  8px;
}

html { scroll-behavior: smooth; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC',
               'PingFang TC', sans-serif;
  background: var(--c-top);
  color: var(--c-white);
  overflow-x: hidden;
}

/* ── Hero ───────────────────────────────────────────────── */
.hero {
  min-height: 100svh;
  background: linear-gradient(160deg, var(--c-top) 0%, var(--c-violet) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  position: relative;
  text-align: center;
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.hero-logo {
  width: clamp(72px, 25vw, 140px);
  height: auto;
  margin-bottom: 0.5rem;
}

.hero-headline {
  font-size: clamp(1.75rem, 6.5vw, 3rem);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.hero-sub {
  font-size: clamp(0.85rem, 2.8vw, 1.1rem);
  opacity: 0.7;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.scroll-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.55;
  animation: nudge 2.2s ease-in-out infinite;
}

@keyframes nudge {
  0%, 100% { transform: translateX(-50%) translateY(0px); }
  50%       { transform: translateX(-50%) translateY(7px); }
}
```

- [ ] **Step 2: Open in browser, verify hero**

```bash
open index.html
```

Expected: full-viewport indigo→violet gradient, centered logo placeholder + headline + sub + animated arrow at bottom.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: hero section CSS"
```

---

## Task 4: CSS — brand story section

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Append story CSS to style.css**

Append to end of `style.css`:

```css
/* ── Brand Story ─────────────────────────────────────────── */
.story {
  background: linear-gradient(180deg, var(--c-violet) 0%, var(--c-mid) 100%);
  padding: 6rem 1.5rem 7rem;
}

.story-inner {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.story-eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
}

.story-headline {
  font-size: clamp(1.6rem, 5.5vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
  background: linear-gradient(180deg, #ffffff 0%, #999999 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.story-beats {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.beat {
  font-size: clamp(0.95rem, 3vw, 1.05rem);
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.22); /* initial dim — JS drives this */
  transition: color 0.35s ease;
}

.beat--bold {
  font-weight: 700;
  letter-spacing: -0.01em;
}

.beat--pillars {
  font-weight: 500;
  letter-spacing: 0.12em;
  font-size: clamp(0.8rem, 2.5vw, 0.9rem);
}

.beat--label {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.18) !important; /* always dim */
}
```

- [ ] **Step 2: Open in browser and scroll through story section**

Expected: eyebrow + gradient headline, then 6 paragraphs that fade in/out as you scroll — the one nearest the viewport center is brightest. Confirm JS scroll handler fires (open DevTools console, no errors).

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: brand story scroll-fade section CSS"
```

---

## Task 5: CSS — product tiers (building floors)

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Append tiers CSS to style.css**

Append to end of `style.css`:

```css
/* ── Product Tiers ───────────────────────────────────────── */
.tiers {
  background: var(--c-mid);
  padding: 5rem 1.5rem;
}

.tiers-heading {
  text-align: center;
  font-size: clamp(1.1rem, 3.5vw, 1.5rem);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.85;
  margin-bottom: 2.5rem;
}

.building {
  max-width: 620px;
  margin: 0 auto;
  border: 1px solid var(--floor-sep);
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: 0 0 0 1px rgba(124, 58, 237, 0.25),
              0 20px 60px rgba(0, 0, 0, 0.4);
}

.floor {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--floor-sep);
  background: rgba(255, 255, 255, 0.04);
  transition: background 0.2s ease;
}

.floor:last-child { border-bottom: none; }

.floor:hover { background: rgba(255, 255, 255, 0.07); }

.floor--training {
  background: rgba(255, 255, 255, 0.02);
  border-top: 2px dashed var(--floor-sep);
}

.floor-scale {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 0.875rem;
}

.floor-products {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.floor-products--pair {
  gap: 0.75rem;
}

.product-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.product-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  padding: 5px;
}

.product-name {
  font-size: 1rem;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  min-height: 44px;
  min-width: 44px;
  background: var(--c-violet);
  color: var(--c-white);
  text-decoration: none;
  border-radius: var(--radius-btn);
  font-size: 0.82rem;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}

.cta-btn:hover,
.cta-btn:active { opacity: 0.82; }

/* Desktop: Nubis pair side-by-side */
@media (min-width: 480px) {
  .floor-products--pair {
    flex-direction: row;
  }

  .floor-products--pair .product-card {
    flex: 1;
  }
}
```

- [ ] **Step 2: Open in browser and verify tiers**

Expected: dark bordered "building" with 5 floors, each showing logo placeholder + product name + violet CTA button. On desktop (≥480px) Nubis and Nubis Cast appear side-by-side. IMSDOM floor has a dashed top border.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: product tiers building floors CSS"
```

---

## Task 6: CSS — contact section + reveal animation

**Files:**
- Modify: `style.css`

- [ ] **Step 1: Append contact CSS to style.css**

Append to end of `style.css`:

```css
/* ── Contact ─────────────────────────────────────────────── */
.contact-section {
  background: var(--c-mid);
  padding: 6rem 1.5rem 7rem;
  transition: background 0.7s ease;
}

.contact-section.is-visible {
  background: var(--c-contact);
}

.contact-card {
  max-width: 380px;
  margin: 0 auto;
  background: var(--c-white);
  border-radius: 16px;
  padding: 2rem 1.75rem;
  box-shadow: 0 8px 48px rgba(0, 0, 0, 0.14);
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  color: var(--c-top);

  opacity: 0;
  transform: translateY(18px);
  transition: opacity 0.55s ease, transform 0.55s ease;
}

.contact-section.is-visible .contact-card {
  opacity: 1;
  transform: translateY(0);
}

.contact-name {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 0.125rem;
}

.contact-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(26, 26, 78, 0.5);
  margin-bottom: 0.125rem;
}

.contact-company {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--c-violet);
  margin-bottom: 0.75rem;
}

.contact-link {
  display: flex;
  align-items: center;
  padding: 0.625rem 0;
  min-height: 44px;
  color: var(--c-violet);
  text-decoration: none;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(26, 26, 78, 0.08);
  transition: opacity 0.2s ease;
}

.contact-link:last-of-type { border-bottom: none; }

.contact-link:hover,
.contact-link:active { opacity: 0.7; }

.contact-address {
  font-size: 0.8rem;
  line-height: 1.65;
  color: rgba(26, 26, 78, 0.5);
  padding-top: 0.625rem;
}
```

- [ ] **Step 2: Open in browser, scroll to contact section**

Expected: section starts dark. As it scrolls into view (≥20% visible), background smoothly lightens to `#f8f8fc` and the white card fades up into view. Phone and email are tappable links.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "feat: contact card + scroll reveal CSS"
```

---

## Task 7: Mobile QA checklist

**Files:** No code changes — verification only.

- [ ] **Step 1: Open Chrome DevTools → toggle device toolbar → set to iPhone SE (375×667)**

Navigate to `index.html`.

Check each item:

- [ ] Hero: headline not truncated, sub visible, arrow visible
- [ ] Story: paragraphs readable, scroll-fade works on touch-scroll simulation
- [ ] Tiers: building fits within screen width, no horizontal overflow
- [ ] Tiers: Nubis + Nubis Cast stack vertically (< 480px)
- [ ] Tiers: CTA buttons ≥ 44px tall (inspect in DevTools)
- [ ] Contact: card fits screen with padding, phone + email tappable
- [ ] No horizontal scrollbar on any section

- [ ] **Step 2: Set to iPhone 14 (390×844) and re-verify same checklist**

- [ ] **Step 3: Check console — zero JS errors**

- [ ] **Step 4: If any issue found, fix it in style.css and re-check**

Common fixes:
- Horizontal overflow: add `max-width: 100%` to the overflowing element or `overflow: hidden` to body
- Button too small: ensure `min-height: 44px` is applied

- [ ] **Step 5: Commit if any fixes were made**

```bash
git add style.css
git commit -m "fix: mobile QA adjustments"
```

---

## Task 8: GitHub repo + Vercel deployment

**Files:** No code changes.

- [ ] **Step 1: Create GitHub repo**

Go to https://github.com/new and create a new **public** repo named `secpos-bd`. Do not initialize with README.

- [ ] **Step 2: Push local repo to GitHub**

```bash
cd ~/secpos-bd
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/secpos-bd.git
git branch -M main
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

- [ ] **Step 3: Import to Vercel**

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select `secpos-bd`
4. In **Configure Project**: leave all fields blank (no build command, no output directory — Vercel auto-detects static HTML)
5. Click **Deploy**

Expected: Vercel builds in ~10 seconds and gives you a URL like `secpos-bd.vercel.app`.

- [ ] **Step 4: Open the Vercel URL on a real phone**

Test the scroll-fade story and contact reveal on an actual mobile device to confirm IntersectionObserver and scroll events fire correctly on Safari iOS.

- [ ] **Step 5: Drop in real logos when ready**

Replace files in `assets/` with actual logo PNGs, then:

```bash
git add assets/
git commit -m "assets: add product logos"
git push
```

Vercel will auto-redeploy on every push to `main`.

---

## Self-review notes

- All four spec sections (Hero, Story, Tiers, Contact) have corresponding tasks ✓
- `onerror` fallback on every `<img>` prevents broken image icons ✓
- `100svh` instead of `100vh` — avoids iOS Safari's notorious toolbar-resize jank ✓
- `.beat--label` uses `!important` to override the JS-driven inline style — intentional, label should always stay dim ✓
- vivipos CTA links to `#contact` (smooth scroll via `html { scroll-behavior: smooth }`) ✓
- All external links have `rel="noopener noreferrer"` ✓
- Phone link uses international format `tel:+886933857545` for NFC-triggered mobile opens ✓
