# Backpack Overlay Alignment — Design

**Date:** 2026-04-18
**Status:** Approved (brainstorm phase)

## Problem

The customizer stacks an SVG (vector regions for color and clicks) and a PNG
(photograph-derived grayscale overlay) inside the same container. The two
assets were authored independently and their aspect ratios, content centers,
and scales do not match exactly. No CSS or container-sizing trick can make
them align pixel-perfectly.

Additionally, the current rendering treats the PNG as the visual base and
applies colors through partially transparent SVG fills
(`fill-opacity: 0.85`). That inverts the natural relationship between
"user-selected color" and "photographic surface detail."

## Constraints

- **SVG is canonical.** The SVG file is the product's design model and its
  geometry and group IDs cannot be changed.
- **PNG is a variable input.** It comes from a real product photo after
  background removal and contrast boosting; lighting, framing, and
  perspective will drift between shots and between bag styles.
- **No automated test suite.** Verification is manual.

## Goal

1. Display each bag view (Front, Back) with the SVG color regions on the
   bottom and the grayscale PNG blended on top via
   `mix-blend-mode: multiply`, so that shadows, stitching, and hardware from
   the photo appear over whatever color the user picks.
2. Provide an explicit per-PNG calibration (translate, scale, rotation) that
   places the PNG into the SVG's coordinate system. Calibration tolerates
   photographic variation; new PNGs or new bag styles add a new calibration
   entry rather than re-authoring the asset.
3. Ship a developer-only calibration UI (slider-based) that lets a designer
   dial in the calibration visually and copy the resulting JSON back into
   source.

## Architecture

### Layer stack (per view)

From bottom to top, inside a container sized by the SVG's viewBox aspect
ratio:

1. **SVG layer** — the existing `FrontSVG` / `BackSVG` components. Fills
   are fully opaque (`fill-opacity: 1`) instead of 0.85. Click wiring and
   group resolution are unchanged from the earlier fix (normalizeId +
   ancestor walk).
2. **PNG overlay layer** — a separate inline `<svg>` sharing the same
   viewBox as the layer below, containing a single `<image href={pngSrc}>`
   transformed by the calibration. Styled with
   `mix-blend-mode: multiply` and `pointer-events: none` so it blends
   onto the color layer without stealing clicks.
3. **Embroidery layer** (Front only) — unchanged.

### Container sizing rule

Width is the shared baseline; height follows each SVG's aspect ratio:

- Front container: `width: 420px, aspectRatio: 992.13 / 992.13` → 420×420.
- Back container: `width: 420px, aspectRatio: 622.13 / 881.02` → 420×~595,
  the extra height accommodates the shoulder straps that hang below the
  bag body.

Future nicety (out of scope for this round): a per-view `displayScale` in
the calibration config if Front's bag body visibly differs in size from
Back's because the two viewBoxes include different amounts of padding.

### Calibration model

```ts
type Calibration = {
  translateX: number;  // SVG viewBox units
  translateY: number;  // SVG viewBox units
  scaleX: number;      // default 1; non-uniform scale allowed
  scaleY: number;      // default 1
  rotation: number;    // degrees
};

const IDENTITY_CALIBRATION: Calibration = {
  translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0,
};
```

Transform application order: **scale and rotate pivot on the PNG's geometric
center; translate is applied last.** Intuitively, dragging the translate
sliders slides the PNG around without disturbing scale/rotation, and
dragging scale/rotation does not cause drift. This is the behavior of every
standard image-alignment tool and matches designer intuition.

## Components

### New files

- `src/lib/overlayCalibration.ts` — exports the `Calibration` type,
  `IDENTITY_CALIBRATION`, and per-view constants (`FRONT_CALIBRATION`,
  `BACK_CALIBRATION`). Initial values are the identity; a designer
  calibration run replaces them.
- `src/components/PngOverlayLayer.tsx` — renders an inline `<svg>` with
  the view's viewBox and a single `<image>` inside, applying the
  calibration as an SVG transform. Props: `viewBox`, `pngSrc`,
  `calibration`, `debug?`. The `debug` flag drops the overlay's opacity
  to 50% so the designer can see both the PNG edges and the SVG paths at
  the same time while aligning.
- `src/components/CalibrationPanel.tsx` — developer-only panel. Activated
  by URL query `?calibrate=front` or `?calibrate=back`; otherwise
  unmounted and never visible to end users. Contains five
  slider/number-input pairs (translateX, translateY, scaleX, scaleY,
  rotation), a "Debug overlay" toggle that wires `debug` on the matching
  `PngOverlayLayer`, and a "Copy JSON" button that serializes the current
  calibration to the clipboard.

### Modified files

- `FrontSVG.tsx` and `BackSVG.tsx` — change `fill-opacity` from `0.85` to
  `1`. No other change.
- `page.tsx` — replace the `<img>` overlay in each view container with a
  `<PngOverlayLayer>`. Add calibration state (`frontCalibration`,
  `backCalibration`), initialized from `overlayCalibration.ts`. Mount
  `<CalibrationPanel>` conditionally based on a URL-query read.

### Deleted

- `src/components/SVGRenderer.tsx` — unused, with drifted group mappings
  documented in `CLAUDE.md`. Removing it eliminates a source of confusion
  for future maintainers.

## Data flow

State ownership stays in `page.tsx`. Existing keys (`selectedPart`,
`colors`, `size`, `embroideryText`, `embroideryPosition`) are unchanged.
New keys:

- `frontCalibration: Calibration`, `backCalibration: Calibration`
- `calibrationTarget: "front" | "back" | null` — derived from URL query
  at mount
- `debugOverlay: boolean`

Render pipeline:

1. `colors` drives SVG path fills via `FrontSVG` / `BackSVG`.
2. `frontCalibration` / `backCalibration` drive `PngOverlayLayer`'s
   transform. The overlay SVG is independent of `colors` and is not
   rebuilt when colors change.
3. `embroideryText` and `embroideryPosition` still render inside
   `FrontSVG`.
4. `calibrationTarget` and `debugOverlay` control `CalibrationPanel`
   visibility and its debug wiring.

User flows:

- **End user coloring.** Clicks a path → `FrontSVG` / `BackSVG` onclick
  fires with the resolved group key → `setSelectedPart(group)` → palette
  click updates `colors[group]` → SVG re-renders with the new fill →
  PNG overlay automatically reflects the change because `multiply`
  composites against whatever the SVG below is painting.
- **Designer calibrating.** Opens `?calibrate=front` → `CalibrationPanel`
  mounts reading initial values from `overlayCalibration.ts` → sliders
  update `frontCalibration` state → `PngOverlayLayer` re-renders with the
  new transform live → designer tunes until the PNG's bag edges overlap
  the SVG's path outlines (optionally with debug overlay enabled) →
  clicks "Copy JSON" → pastes into `overlayCalibration.ts` → next dev
  server reload makes the value the new default.

Calibration is explicitly **not** written back to source at runtime. The
clipboard round-trip keeps the dev UI and the committed config cleanly
separated and prevents end users from accidentally persisting bad values.

## Error handling

| Scenario                                      | Behavior                                                                 |
|-----------------------------------------------|--------------------------------------------------------------------------|
| Calibration missing for a view                | Falls back to `IDENTITY_CALIBRATION`                                     |
| PNG fails to load (404 / network)             | `<image>` `onerror` hides the overlay; SVG colors still usable           |
| SVG fetch fails                               | Unchanged from current behavior (empty container); out of scope          |
| URL query value invalid (e.g. `?calibrate=x`) | Panel is not mounted                                                     |
| Extreme calibration values                    | Not validated; breakage is visible to the designer and corrected by them |
| `mix-blend-mode` unsupported                  | Degrades to a plain overlay; no polyfill                                 |

## Verification (manual)

After implementation, verify:

1. **Clickable regions.** Every known group on Front (Front_Main_Top/Bottom,
   Front_Side_L/R, SidePanel ×6, Side_Front, Band_Top, Bottom) and on Back
   (Back_Main ×7, Back_Strap_L/R, Back_Side_L/R, SidePanel ×6, Side_L/R,
   Band_Top, Band_1..6, Bottom) responds to clicks with the correct
   selected group.
2. **Coloring.** Selected colors show in saturated form (no 0.85 washout).
   PNG stitching / shadows remain visible through the blend. Changing
   color does not flicker or reload the PNG.
3. **Sizing.** Front is square. Back is taller than it is wide. Both
   containers share the same width.
4. **Calibration UI.** Hidden without `?calibrate=`. Visible with
   `?calibrate=front` or `?calibrate=back` and targets the right view.
   All five controls move the PNG live. Debug toggle halves the PNG
   opacity so the SVG paths below are visible. Copy JSON emits a value
   that parses back when pasted into
   `overlayCalibration.ts`.
5. **Regressions.** Embroidery text appears on Front, not Back. Color
   palette, size toggle, and summary table work as before.

## Explicitly out of scope

- Automated test harness (project has none; introducing one is a separate
  project).
- Rewriting `FrontSVG` / `BackSVG` into a shared component. The duplicated
  group-resolution logic is documented in `CLAUDE.md` and left for a
  later pass; consolidating it now would widen the blast radius of this
  change.
- The pre-existing performance issue where the SVG is re-fetched on every
  `colors` change due to the `useEffect` dependency list.
