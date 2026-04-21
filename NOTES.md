# Customizer Tuning Notes

Snapshot of tuned values as of 2026-04-20. These are the hand-calibrated numbers that make Front/Back views align and the UI breathe correctly. If you revert any of them, re-tune before shipping.

## Overlay calibration (`src/lib/overlayCalibration.ts`)

```ts
FRONT_CALIBRATION   = { translateX:  15, translateY:    4, scaleX: 1.03,  scaleY: 1.03,  rotation: 0 }
BACK_CALIBRATION    = { translateX:   0, translateY: -116, scaleX: 1.025, scaleY: 0.715, rotation: 0 }
BACK_SVG_TRANSFORM  = { translateX:  -4, translateY: -116, scaleX: 0.64,  scaleY: 0.635, rotation: 0 }
```

- `FRONT_CALIBRATION` / `BACK_CALIBRATION` align the photographic PNG overlay onto the SVG's colored regions.
- `BACK_SVG_TRANSFORM` is a separate layout transform on the Back SVG content so it sits at the same on-screen position as the calibrated Back PNG. Independent of PNG alignment — only tune if you want to move the whole Back view.

## Layout (`src/app/page.tsx`)

```ts
BASE_CONTAINER_WIDTH = 420
SIZE_SCALE = { "14": 14/16, "16": 1 }   // proportional container scale
```

- Bag row: `display: flex; gap: 10; alignItems: flex-start`
- Size-scale wrapper inside each bag: `transform: scale(SIZE_SCALE[size]); transformOrigin: center center`
- Color section pulled up into the bag row's bottom padding: `marginTop: -140`
  - Combined with outer `gap: 28`, effective gap is ~-112px — this is the knob to tune if Fabric Color Selection starts overlapping visible bag content (raise toward 0) or if the gap looks too wide again (push more negative).
- Main container `gap: 28` between rows.

## Embroidery (`src/components/FrontSVG.tsx` + `EmbroideryControls.tsx`)

```ts
SIZE_PX      = { small: 32, medium: 48, large: 72 }   // per-line font size in SVG units
STROKE_WIDTH = 3                                      // halo thickness
FONT_FAMILY  = {
  serif:        "Georgia, 'Times New Roman', serif",
  "sans-serif": "Arial, Helvetica, sans-serif",
}
```

- Halo uses `stroke` + `paintOrder="stroke"` (single `<text>` per line). Shadow color is `darken(embroideryColor, 0.5)`.
- Width cap: `maxTextWidth = box.width / 2`. `textLength` + `lengthAdjust="spacingAndGlyphs"` only applied when `line.length * fs * 0.55 > maxTextWidth`.
- Vertical anchor: `top` → `box.y + box.height/2`, `bottom` → `box.y + box.height * 0.85`.
- Two lines stack symmetrically around the anchor with line-height `fs * 1.2`.

## Assets

- Front SVG viewBox: `992.13 × 992.13` (square)
- Back SVG viewBox: `622.13 × 881.02` (portrait ~0.706)
- `/texture/*-Overlay.png`: 1000×1000
- Front SVG uses Illustrator `_x5F_` id encoding; Back SVG uses plain underscores. `normalizeId()` handles both.
- `Front_x5F_Logo` group is removed on load (not in the group map).

## Calibration workflow

1. `npm run dev`, visit `?calibrate=front` or `?calibrate=back`.
2. Tune sliders; toggle Debug overlay.
3. Copy JSON → paste into the matching constant above.
4. Reload without the query param and verify color doesn't bleed past the bag silhouette.
