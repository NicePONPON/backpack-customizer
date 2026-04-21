# Paracord Zipper Pull Upgrade — Design

**Date:** 2026-04-20
**Status:** Approved (brainstorm phase)

## Problem

The customizer currently lets the user pick fabric colors and embroidery. It does not expose a hardware-upgrade path. The product supports an upgrade from the stock zipper pull to a paracord pull at the two center-top zipper sliders on the main compartment. Customers need to be able to (a) opt into the upgrade, (b) pick a paracord color, and (c) see the upgrade rendered on the Front view before confirming.

## Goal

1. Add a single "Paracord Zipper Pull Upgrade" control that toggles the upgrade on/off and picks one shared paracord color.
2. When the upgrade is on, render two paracord zipper pulls at the center-top of `Front_Main_Top` in the chosen color, using the same visual model as the bag (color layer + grayscale PNG on top with `mix-blend-mode: multiply`).
3. Scale automatically with the existing 14/16 size toggle.
4. Make it straightforward for a later commit to add a line item for this upgrade to the forthcoming invoice feature.

## Non-goals

- Per-pull independent color. Both pulls share one color; this is a package upgrade.
- Per-pull toggling. The upgrade is all-or-nothing.
- Paracord upgrades on zippers other than the two center-top main-compartment sliders (the pocket zipper on `Front_Main_Bottom` and any Back-view zippers are out of scope).
- Additional paracord colors beyond **Ivory Dune** and **Ash Steel**. Adding a third is a data-only change to the palette array, not a design change.
- Pricing and invoice wiring. Tracked separately.

## Constraints

- **Reuse the bag's visual model.** The bag stacks a color-fill SVG layer under a grayscale PNG overlay with `mix-blend-mode: multiply`. The zipper pull must look consistent with this treatment.
- **No new art assets.** The supplied `public/texture/Zipper-Overlay.png` is the only asset; its alpha channel must serve as the shape mask for the color layer.
- **No additional dependencies.** Pure CSS / SVG features only.
- **Must scale with the size toggle.** Whatever renders the pulls must live inside the Front SVG so the existing `transform: scale(SIZE_SCALE[size])` wrapper scales it automatically.

## Palette

The zipper-pull palette reuses the fabric palette entries by name and hex, so a customer can match hardware to fabric:

| Display name | Hex     |
| ------------ | ------- |
| Ivory Dune   | #FFF6DF |
| Ash Steel    | #727576 |

The **same hex** is used for fabric and hardware. If product marketing later decides paracord comes in a slightly different shade than fabric, the palette can diverge at that point; for now, name and hex match.

## State model

Add two pieces of state to `src/app/page.tsx`:

```ts
const [zipperUpgrade, setZipperUpgrade] = useState<boolean>(false);
const [zipperColor, setZipperColor] = useState<string>("#FFF6DF"); // Ivory Dune default
```

When `zipperUpgrade === false`, `zipperColor` is retained but not used visually. This keeps the last-picked color sticky if the user toggles off and back on.

Both pieces of state are passed down to `FrontSVG` as props. `BackSVG` is unaffected.

## Controls

A new **Zipper Pull Upgrade** section sits between the Embroidery controls and the summary table, in the existing single-column control stack on `page.tsx`.

Two rows:

1. **Toggle row.** Two pills: `Stock` (default) and `Paracord`. Same visual treatment as the existing embroidery and 14/16 pills, so the component reads consistently.
2. **Color row.** Shown only when `Paracord` is selected. Two circular swatches, same visual treatment as the fabric swatches: `{ Ivory Dune, Ash Steel }`. Selected swatch gets the same blue ring outline used elsewhere.

Extract the new controls into a component:

- **Create:** `src/components/ZipperPullControls.tsx`

Props:

```ts
type Props = {
  enabled: boolean;
  color: string;
  onEnabledChange: (next: boolean) => void;
  onColorChange: (next: string) => void;
};
```

Styling matches the existing `EmbroideryControls` inline-style vocabulary (white-border pills, 36px swatch circles, 12px caption under each swatch).

The palette array is defined in `ZipperPullControls.tsx` and exported so the summary table on `page.tsx` can resolve a hex back to a display name:

```ts
export const ZIPPER_COLORS = [
  { name: "Ivory Dune", value: "#FFF6DF" },
  { name: "Ash Steel",  value: "#727576" },
] as const;
```

## Visual rendering

The pull is rendered inside the Front SVG, not as a separate absolutely-positioned DOM layer. This ensures it scales with the 14/16 toggle automatically and lines up with the bag regardless of container size.

Rendering unit per pull, inside the Front SVG's viewBox coordinate space:

```xml
<!-- shared, one-time definitions -->
<defs>
  <mask id="zipperPullMask_{i}" maskUnits="userSpaceOnUse" x="{x}" y="{y}" width="{w}" height="{h}">
    <image href="/texture/Zipper-Overlay.png" x="{x}" y="{y}" width="{w}" height="{h}"
           preserveAspectRatio="xMidYMid meet"/>
  </mask>
</defs>

<!-- per pull -->
<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{zipperColor}" mask="url(#zipperPullMask_{i})"/>
<image href="/texture/Zipper-Overlay.png" x="{x}" y="{y}" width="{w}" height="{h}"
       preserveAspectRatio="xMidYMid meet"
       style="mix-blend-mode: multiply"/>
```

Why this works:

- The mask uses the PNG's grayscale alpha (the rope silhouette). Inside the rope, mask pixels are white/bright, so the color `<rect>` shows. Outside, mask pixels are transparent, so the `<rect>` is suppressed — color does not leak into the surrounding transparent area.
- The `<image>` on top with `mix-blend-mode: multiply` paints highlights and shadows onto the colored rope. Pure white pixels of the rope leave the color unchanged; gray pixels darken the color at the knot wrap and the undersides of the loop, producing the shaded paracord look.
- Because both layers live inside the Front SVG, they inherit the SVG's viewBox transform, which in turn inherits the size-scale wrapper.

## Anchor positions

The two pulls sit at the center-top of `Front_Main_Top`, derived at SVG-load time via `getBBox()` on `#Front_x5F_Main_x5F_Top1`, following the same pattern used for embroidery positioning.

Derived values:

```ts
const box = target.getBBox();
const centerX = box.x + box.width / 2;
const pullSeparation = 70;            // SVG units between the two pull centers
const pullLeftCenterX = centerX - pullSeparation / 2;
const pullRightCenterX = centerX + pullSeparation / 2;
const pullTopY = box.y - 10;          // slightly above Front_Main_Top's top edge
const pullWidth = 80;                 // SVG units, tune during impl
const pullHeight = 160;                // preserves ~1:2 aspect of the PNG
```

The rendered `<rect>` / `<image>` `x` for each pull is `centerX - pullWidth/2`; `y` is `pullTopY`.

These four constants (`pullSeparation`, `pullTopY` offset, `pullWidth`, `pullHeight`) are tunable at the top of `FrontSVG.tsx` next to the embroidery constants. No URL-driven calibration UI is needed; a developer adjusts the constants until the pulls sit correctly over the bag's zipper track.

## File changes

- **Create:** `src/components/ZipperPullControls.tsx` — toggle + swatch UI.
- **Modify:** `src/app/page.tsx` — add state, mount `<ZipperPullControls>`, pass `zipperUpgrade` and `zipperColor` to `<FrontSVG>`.
- **Modify:** `src/components/FrontSVG.tsx` — add props `zipperUpgrade` and `zipperColor`, compute anchor positions from `Front_Main_Top`'s bbox, render two paracord pulls when `zipperUpgrade === true`.
- **No change:** `BackSVG.tsx`, `PngOverlayLayer.tsx`, `overlayCalibration.ts`, `EmbroideryControls.tsx`.

## Asset

`public/texture/Zipper-Overlay.png` — white paracord loop with knot wrap and split-ring, transparent background. Used both as the mask source (for the color layer) and as the multiply overlay (for shadows and texture).

## Verification

1. `npx tsc --noEmit` → exit 0.
2. `npm run build` → exit 0.
3. `npm run dev`, open `http://localhost:3000`:
   - Default view: no paracord pulls visible on Front, Back unaffected.
   - Click **Paracord** in the new section: two paracord pulls appear at the center-top of Front_Main_Top in Ivory Dune. Shape, highlights, and knot wrap shading are visible.
   - Click **Ash Steel** swatch: both pulls change to medium charcoal instantly.
   - Click **Stock**: both pulls disappear, color selection stays highlighted for when user toggles back on.
   - Click **14 inch** toggle: both pulls scale down proportionally with the bag.
   - Click **16 inch**: pulls scale back up.
4. Verify that neither pull's color leaks outside the rope silhouette (mask is working).
5. Verify existing features still work: fabric color picker, embroidery text/color/font/size, summary table.
