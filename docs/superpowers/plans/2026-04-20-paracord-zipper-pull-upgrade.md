# Paracord Zipper Pull Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a toggle + color picker that overlays two paracord zipper pulls on the center-top of `Front_Main_Top` in the user-chosen color.

**Architecture:** A new `<ZipperPullControls>` component adds a toggle + color swatches to the control stack. `page.tsx` holds `zipperUpgrade` and `zipperColor` state and passes them to `<FrontSVG>`. `<FrontSVG>` measures `Front_Main_Top`'s bbox at SVG-load time, then renders two SVG pulls inside the injected SVG: a masked `<rect>` (color layer) + the `Zipper-Overlay.png` `<image>` on top with `mix-blend-mode: multiply`.

**Tech Stack:** Next.js 16, React 19, TypeScript, inline-styled controls, SVG mask + `mix-blend-mode`.

**Testing note:** This repository has no automated test suite (see `CLAUDE.md`: "No test suite is configured"). Verification per task is **`npx tsc --noEmit`** (type check), **`npm run build`** (production build), and a scripted manual check on `npm run dev`. No test files are created.

**Reference spec:** `docs/superpowers/specs/2026-04-20-paracord-zipper-pull-upgrade-design.md`

---

## File Structure

- **Create:** `src/components/ZipperPullControls.tsx` — owns the toggle pills, color swatches, and the `ZIPPER_COLORS` palette export.
- **Modify:** `src/app/page.tsx` — adds `zipperUpgrade` + `zipperColor` state, mounts `<ZipperPullControls>` between `<EmbroideryControls>` and the summary table, passes new props into `<FrontSVG>`.
- **Modify:** `src/components/FrontSVG.tsx` — accepts new props; inside the fetch callback, captures `Front_Main_Top`'s bbox; renders paracord pull markup (mask def + `<rect>` + `<image>` per pull) when `zipperUpgrade === true`.
- **No change:** `BackSVG.tsx`, `EmbroideryControls.tsx`, `PngOverlayLayer.tsx`, `overlayCalibration.ts`, `NOTES.md` (NOTES.md is updated in Task 4 as a follow-up).

Three implementation tasks, then one notes/commit task.

---

## Task 1: Create `ZipperPullControls` component

**Files:**
- Create: `src/components/ZipperPullControls.tsx`

- [ ] **Step 1: Create the component file**

File: `src/components/ZipperPullControls.tsx`

```tsx
"use client";

export const ZIPPER_COLORS = [
  { name: "Ivory Dune", value: "#FFF6DF" },
  { name: "Ash Steel", value: "#727576" },
] as const;

export type ZipperColor = (typeof ZIPPER_COLORS)[number]["value"];

type Props = {
  enabled: boolean;
  color: string;
  onEnabledChange: (next: boolean) => void;
  onColorChange: (next: string) => void;
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 18px",
  borderRadius: 999,
  background: active ? "#fff" : "transparent",
  color: active ? "#111" : "#fff",
  fontWeight: 600,
  border: "1px solid #fff",
  cursor: "pointer",
});

export default function ZipperPullControls({
  enabled,
  color,
  onEnabledChange,
  onColorChange,
}: Props) {
  return (
    <div style={{ width: "100%", maxWidth: 900, color: "#fff" }}>
      <div style={{ textAlign: "center", marginBottom: 14, fontWeight: 700 }}>
        Zipper Pull Upgrade
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <button
          onClick={() => onEnabledChange(false)}
          style={pillStyle(!enabled)}
        >
          Stock
        </button>
        <button
          onClick={() => onEnabledChange(true)}
          style={pillStyle(enabled)}
        >
          Paracord
        </button>
      </div>

      {enabled && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {ZIPPER_COLORS.map((c) => (
            <div
              key={c.value}
              onClick={() => onColorChange(c.value)}
              style={{ textAlign: "center", cursor: "pointer" }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: c.value,
                  margin: "0 auto",
                  border:
                    color === c.value
                      ? "3px solid #4aa3ff"
                      : "1px solid #444",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 12, color: "#e4e4e4" }}>{c.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ZipperPullControls.tsx
git commit -m "feat: add ZipperPullControls (toggle + swatches)"
```

---

## Task 2: Wire state in `page.tsx` and mount the controls

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Import the new component and palette**

In `src/app/page.tsx`, locate the existing import for `EmbroideryControls`:

```tsx
import EmbroideryControls, {
  EMBROIDERY_COLORS,
  type EmbroideryColor,
  type EmbroideryPosition,
  type EmbroideryLineSize,
} from "@/components/EmbroideryControls";
```

Immediately after it, add:

```tsx
import ZipperPullControls, {
  ZIPPER_COLORS,
} from "@/components/ZipperPullControls";
```

- [ ] **Step 2: Add state declarations**

In the component body, right after the last embroidery state block (`setEmbroideryLineSizes`), add:

```tsx
  const [zipperUpgrade, setZipperUpgrade] = useState<boolean>(false);
  const [zipperColor, setZipperColor] = useState<string>(
    ZIPPER_COLORS[0].value
  );
```

- [ ] **Step 3: Pass props to `<FrontSVG>`**

Find the existing `<FrontSVG ... />` JSX (currently around line 238–247). Add two props to it — after `embroideryLineSizes`:

```tsx
            <FrontSVG
              colors={colors}
              setSelectedPart={setSelectedPart}
              embroideryLines={embroideryLines}
              embroideryLineCount={embroideryLineCount}
              embroideryColor={embroideryColor}
              embroideryPosition={embroideryPosition}
              embroideryFont={embroideryFont}
              embroideryLineSizes={embroideryLineSizes}
              zipperUpgrade={zipperUpgrade}
              zipperColor={zipperColor}
            />
```

(The two new lines are `zipperUpgrade` and `zipperColor`. The rest is unchanged.)

- [ ] **Step 4: Mount `<ZipperPullControls>` under `<EmbroideryControls>`**

Right after the closing `</EmbroideryControls>` tag (currently line 373), insert:

```tsx
      <ZipperPullControls
        enabled={zipperUpgrade}
        color={zipperColor}
        onEnabledChange={setZipperUpgrade}
        onColorChange={setZipperColor}
      />
```

(This sits between `<EmbroideryControls>` and the `{/* SUMMARY */}` comment.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (Will fail at the `<FrontSVG>` call until Task 3 lands — acceptable to defer commit until then. If you want a green checkpoint now, comment out the two new `<FrontSVG>` props temporarily.)

Instead, for an independently-green commit, **skip Step 3 here** and do Step 3 as the first step of Task 3. Proceed to Step 6.

- [ ] **Step 6: Type-check without the FrontSVG props**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 8: Dev sanity check**

Run: `npm run dev` then open `http://localhost:3000`.
Expected: the new "Zipper Pull Upgrade" section appears below Embroidery. Clicking "Paracord" reveals the two swatches; selecting a swatch highlights it with the blue ring. The Front bag shows **no visual change yet** (rendering lands in Task 3).

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire zipper pull state and mount ZipperPullControls"
```

---

## Task 3: Render paracord pulls in `FrontSVG`

**Files:**
- Modify: `src/components/FrontSVG.tsx`

- [ ] **Step 1: Extend the Props type**

In `src/components/FrontSVG.tsx`, locate the existing `Props` type (currently around line 55–64). Replace it with:

```tsx
type Props = {
  colors: Record<string, string>;
  setSelectedPart: (part: string) => void;
  embroideryLines: [string, string];
  embroideryLineCount: 1 | 2;
  embroideryColor: string;
  embroideryPosition: "top" | "bottom";
  embroideryFont: "serif" | "sans-serif";
  embroideryLineSizes: [LineSize, LineSize];
  zipperUpgrade: boolean;
  zipperColor: string;
};
```

- [ ] **Step 2: Destructure the new props**

Locate the component signature:

```tsx
export default function FrontSVG({
  colors,
  setSelectedPart,
  embroideryLines,
  embroideryLineCount,
  embroideryColor,
  embroideryPosition,
  embroideryFont,
  embroideryLineSizes,
}: Props) {
```

Replace with:

```tsx
export default function FrontSVG({
  colors,
  setSelectedPart,
  embroideryLines,
  embroideryLineCount,
  embroideryColor,
  embroideryPosition,
  embroideryFont,
  embroideryLineSizes,
  zipperUpgrade,
  zipperColor,
}: Props) {
```

- [ ] **Step 3: Add constants for the pulls near the existing constants**

Near the top of the file next to `SIZE_PX` / `STROKE_WIDTH` declarations, add:

```tsx
const ZIPPER_PULL_WIDTH = 80;
const ZIPPER_PULL_HEIGHT = 160;
const ZIPPER_PULL_SEPARATION = 70;
const ZIPPER_PULL_Y_OFFSET = -10; // SVG units above Front_Main_Top's top edge
const ZIPPER_PNG_SRC = "/texture/Zipper-Overlay.png";
```

- [ ] **Step 4: Compute pull positions from bbox**

The file already measures `Front_Main_Top` in the fetch callback to size embroidery. Reuse that `topBox` state.

Below the `const box = embroideryPosition === "top" ? topBox : bottomBox;` line, add a block that derives the two pull positions:

```tsx
  const pullPositions =
    zipperUpgrade && topBox
      ? (() => {
          const centerX = topBox.x + topBox.width / 2;
          const y = topBox.y + ZIPPER_PULL_Y_OFFSET;
          const leftX =
            centerX - ZIPPER_PULL_SEPARATION / 2 - ZIPPER_PULL_WIDTH / 2;
          const rightX =
            centerX + ZIPPER_PULL_SEPARATION / 2 - ZIPPER_PULL_WIDTH / 2;
          return [
            { x: leftX, y, key: "left" as const },
            { x: rightX, y, key: "right" as const },
          ];
        })()
      : null;
```

- [ ] **Step 5: Render the pulls in the overlay SVG**

The file's return statement already contains a `{rendered && (<svg ...>{rendered}</svg>)}` block for embroidery. Change the render gate so the overlay `<svg>` also renders when pulls are present, and include the pull markup inside it.

Replace the final JSX `return (...)` with:

```tsx
  return (
    <>
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
        }}
      />

      {(rendered || pullPositions) && (
        <svg
          viewBox="0 0 992.13 992.13"
          preserveAspectRatio="xMidYMid meet"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            zIndex: 4,
            pointerEvents: "none",
          }}
        >
          {pullPositions && (
            <defs>
              {pullPositions.map((p) => (
                <mask
                  key={p.key}
                  id={`zipperPullMask_${p.key}`}
                  maskUnits="userSpaceOnUse"
                  x={p.x}
                  y={p.y}
                  width={ZIPPER_PULL_WIDTH}
                  height={ZIPPER_PULL_HEIGHT}
                >
                  <image
                    href={ZIPPER_PNG_SRC}
                    x={p.x}
                    y={p.y}
                    width={ZIPPER_PULL_WIDTH}
                    height={ZIPPER_PULL_HEIGHT}
                    preserveAspectRatio="xMidYMid meet"
                  />
                </mask>
              ))}
            </defs>
          )}

          {pullPositions &&
            pullPositions.map((p) => (
              <g key={p.key}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={ZIPPER_PULL_WIDTH}
                  height={ZIPPER_PULL_HEIGHT}
                  fill={zipperColor}
                  mask={`url(#zipperPullMask_${p.key})`}
                />
                <image
                  href={ZIPPER_PNG_SRC}
                  x={p.x}
                  y={p.y}
                  width={ZIPPER_PULL_WIDTH}
                  height={ZIPPER_PULL_HEIGHT}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ mixBlendMode: "multiply" }}
                />
              </g>
            ))}

          {rendered}
        </svg>
      )}
    </>
  );
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 8: Visual check — default state**

Run: `npm run dev` then open `http://localhost:3000`.

Verify:
- On page load, the Front bag shows **no paracord pulls**.

- [ ] **Step 9: Visual check — enable the upgrade**

In the "Zipper Pull Upgrade" section, click **Paracord**.

Verify:
- Two paracord pulls appear near the top-center of the Front bag in **Ivory Dune** (`#FFF6DF`).
- The rope silhouette is visible with shading from the knot wrap.
- No color leaks outside the rope outline (mask working).

- [ ] **Step 10: Visual check — switch color**

Click the **Ash Steel** swatch.

Verify: both pulls change to the darker charcoal instantly, preserving the rope texture and shadowing.

- [ ] **Step 11: Visual check — switch off**

Click **Stock**.

Verify: both pulls disappear. The swatch previously selected (Ash Steel) remains visually remembered when the swatch row reappears on next Paracord toggle.

- [ ] **Step 12: Visual check — size scaling**

Click the **14 inch** pill at the top. Then click **16 inch**.

Verify: the paracord pulls scale proportionally with the bag at both sizes, and stay anchored over the zipper track region.

- [ ] **Step 13: Visual check — position tuning decision**

If the two pulls do not sit exactly at the visible zipper-track area on the photo (they may be slightly too high, too low, or too far apart given asset drift), adjust the four tuning constants introduced in Step 3:

- `ZIPPER_PULL_WIDTH` / `ZIPPER_PULL_HEIGHT` — size of each pull (preserve aspect if possible).
- `ZIPPER_PULL_SEPARATION` — horizontal distance between the two pull centers.
- `ZIPPER_PULL_Y_OFFSET` — negative pushes pulls up, positive pushes down.

Iterate on these values, reload dev, and re-verify Steps 9–12 until placement looks correct. This is a deliberately iterative step — expect 2–3 adjustments.

- [ ] **Step 14: Regression check**

Verify existing features still work:
- Fabric color picker: clicking a fabric color still re-colors the correct part on both views.
- Embroidery: typing text still renders with halo and stays within the Front_Top region; font + size switches still work.
- Summary table: still renders part names with their color names.
- Back view: unaffected — no pulls should appear there, and the back PNG/SVG alignment is unchanged.

- [ ] **Step 15: Commit**

```bash
git add src/components/FrontSVG.tsx
git commit -m "feat: render paracord zipper pulls on Front_Main_Top with masked color + multiply overlay"
```

---

## Task 4: Update `NOTES.md`

**Files:**
- Modify: `NOTES.md`

- [ ] **Step 1: Append a Zipper Pull section to NOTES.md**

Read the existing `NOTES.md`. Append this section after the Embroidery section and before the Assets section:

```markdown
## Zipper Pull Upgrade (`src/components/FrontSVG.tsx` + `ZipperPullControls.tsx`)

```ts
ZIPPER_PULL_WIDTH      = 80
ZIPPER_PULL_HEIGHT     = 160
ZIPPER_PULL_SEPARATION = 70
ZIPPER_PULL_Y_OFFSET   = -10   // SVG units above Front_Main_Top top edge
```

- Paracord pulls render only when `zipperUpgrade === true`; both pulls share the one chosen `zipperColor`.
- Visual technique: SVG `<mask>` with `Zipper-Overlay.png` (alpha) → `<rect fill={zipperColor} mask=...>` + `<image>` with `mix-blend-mode: multiply` on top. Identical model to the bag (color layer + photographic overlay).
- Palette reuses fabric names/hex: Ivory Dune `#FFF6DF`, Ash Steel `#727576` (see `ZipperPullControls.tsx:ZIPPER_COLORS`).
```

Replace the concrete values with whatever final values Task 3 Step 13 landed on.

- [ ] **Step 2: Commit**

```bash
git add NOTES.md
git commit -m "docs: note zipper pull tuning constants and palette"
```

---

## Self-Review Notes

**Spec coverage:**
- Goal (1) "single toggle + one shared color" — Task 1 + Task 2.
- Goal (2) "color layer + grayscale PNG multiply" — Task 3 Step 5.
- Goal (3) "scale with 14/16 toggle" — emerges from rendering inside Front SVG + verified in Task 3 Step 12.
- Goal (4) "invoice line item ready" — palette export (`ZIPPER_COLORS`) lands in Task 1; actual invoice is a separate spec.
- All non-goals are respected: no per-pull independence, pocket zipper untouched, Back untouched, no additional colors.

**Placeholder scan:** no TBD/TODO/"adjust later" phrasings — Task 3 Step 13 explicitly iterates on numeric constants and is not a placeholder. Every code block is complete.

**Type consistency:**
- `ZIPPER_COLORS` exported shape: `{ name: string; value: string }[]` (declared in Task 1, consumed in Task 2 via `ZIPPER_COLORS[0].value`).
- `zipperUpgrade: boolean`, `zipperColor: string` — identical shape in Task 2 state, Task 2 prop pass-through, Task 3 `Props` type.
- The existing `topBox` state is reused in Task 3 Step 4 — no new state needed.
