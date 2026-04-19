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

The `colors` state in `page.tsx` is keyed by the **logical group** (e.g. `BACK_MAIN`, `BAND`, `FRONT_BACK_SIDE`), not the raw SVG id. Many raw ids collapse into one group — e.g. `Back_Main_1` through `Back_Main_7` all map to `BACK_MAIN`, and both `Front_Side*` and `Back_Side*` deliberately merge into `FRONT_BACK_SIDE` so side panels stay consistent across views. The mapping lives in `getGroup()` inside each SVG component and **must be kept identical between `FrontSVG` and `BackSVG`**.

### SVG quirks to know before editing

These are the non-obvious things that break if you don't know about them:

- **Front SVG uses Illustrator `_x5F_` encoding** in its ids (e.g. `Front_x5F_Side_x5F_R`). Back SVG uses plain underscores (`Back_Side_R`). Any group-matching logic that looks at raw ids needs to normalize `_x5F_` → `_` or it will silently miss every Front-side path.
- **Back SVG has 4-level nested `<g>`** (e.g. `Bottom` → `Bottom-2` → `Bottom1` → `uuid-…` → `<path>`). `path.closest("g")` returns the innermost wrapper (often a `uuid-…` id that matches nothing). To resolve the logical group you must walk up the ancestor chain and match the first `<g id>` that has a known prefix.
- **Aspect ratios differ between the two views.** Front SVG viewBox is `992.13 × 992.13` (square); Back SVG viewBox is `622.13 × 881.02` (~0.706, portrait). The `/texture/*-Overlay.png` files in `public/texture/` are both 1000×1000. The SVG and the PNG overlay are stacked absolutely inside the same container in `page.tsx`; for their edges to line up, the container's aspect ratio must match the SVG's viewBox (the PNG is stretched to the container).
- **Invisible paths need a transparent fill** (`rgba(0,0,0,0.01)` in the current code) and `pointer-events: all`, otherwise un-colored regions are not clickable.

### Part name display

`getDisplayName()` in `page.tsx` maps raw-id prefixes back to human-readable labels shown in the summary table. When you add or rename a group, you must update **three places**: the `getGroup` logic in both SVG components, the `COLOR_GROUPS` palette if relevant, and `getDisplayName` in `page.tsx`.
