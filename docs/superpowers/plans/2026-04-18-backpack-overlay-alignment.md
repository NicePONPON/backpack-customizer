# Backpack Overlay Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip the rendering architecture so SVG color fills are on the bottom and the photograph-derived PNG overlay is on top with `mix-blend-mode: multiply`, positioned via per-PNG calibration that a developer can tune with sliders.

**Architecture:** Inside each view container, `FrontSVG` / `BackSVG` render opaque colored paths at the bottom, a new `PngOverlayLayer` renders the PNG inside an inline `<svg>` sharing the same viewBox (so alignment is in SVG user units, not pixels), and `mix-blend-mode: multiply` on that overlay composites photographic shading onto whatever color the user picked. A `CalibrationPanel` mounted only when the URL has `?calibrate=front|back` provides five sliders that drive the calibration state live and a "Copy JSON" button that round-trips values back into source.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, path alias `@/*` → `src/*`. No test runner exists; verification is `npx tsc --noEmit` for type correctness and manual browser checks against explicit acceptance criteria. The plan substitutes "type-check + manual verify" for TDD's test-first cycle, consistent with the spec's "No automated test suite" constraint.

**Spec:** `docs/superpowers/specs/2026-04-18-backpack-overlay-alignment-design.md`

---

## Task 1: Calibration types and per-view data

**Files:**
- Create: `src/lib/overlayCalibration.ts`

- [ ] **Step 1: Create the calibration module**

Create `src/lib/overlayCalibration.ts`:

```ts
export type Calibration = {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export const IDENTITY_CALIBRATION: Calibration = {
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

export const FRONT_CALIBRATION: Calibration = { ...IDENTITY_CALIBRATION };
export const BACK_CALIBRATION: Calibration = { ...IDENTITY_CALIBRATION };

export type ViewKey = "front" | "back";
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/overlayCalibration.ts
git commit -m "feat: add overlay calibration types and defaults"
```

---

## Task 2: PngOverlayLayer component

**Files:**
- Create: `src/components/PngOverlayLayer.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/PngOverlayLayer.tsx`:

```tsx
"use client";

import type { Calibration } from "@/lib/overlayCalibration";

type Props = {
  viewBoxW: number;
  viewBoxH: number;
  pngSrc: string;
  calibration: Calibration;
  debug?: boolean;
};

export default function PngOverlayLayer({
  viewBoxW,
  viewBoxH,
  pngSrc,
  calibration,
  debug = false,
}: Props) {
  const cx = viewBoxW / 2;
  const cy = viewBoxH / 2;
  const { translateX, translateY, scaleX, scaleY, rotation } = calibration;

  // SVG transforms apply right-to-left:
  //   1. translate(-cx,-cy) moves the image center to the origin
  //   2. scale and rotate therefore pivot on the original center
  //   3. translate(cx,cy) moves the image back
  //   4. translate(translateX,translateY) applies the user offset last
  const transform = [
    `translate(${translateX} ${translateY})`,
    `translate(${cx} ${cy})`,
    `rotate(${rotation})`,
    `scale(${scaleX} ${scaleY})`,
    `translate(${-cx} ${-cy})`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        mixBlendMode: "multiply",
        pointerEvents: "none",
        zIndex: 3,
        opacity: debug ? 0.5 : 1,
      }}
    >
      <image
        href={pngSrc}
        x={0}
        y={0}
        width={viewBoxW}
        height={viewBoxH}
        transform={transform}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/PngOverlayLayer.tsx
git commit -m "feat: add PngOverlayLayer with calibration transform"
```

---

## Task 3: Wire PngOverlayLayer into page.tsx and switch to width-based containers

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
import { useState } from "react";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
```

`new_string`:
```tsx
import { useState } from "react";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  type Calibration,
} from "@/lib/overlayCalibration";
```

- [ ] **Step 2: Add viewBox constants**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
const FRONT_TEXTURE_SRC = "/texture/Front-Overlay.png";
const BACK_TEXTURE_SRC = "/texture/Back-Overlay.png";
const LOGO_SRC = "/logo/logo.png";
```

`new_string`:
```tsx
const FRONT_TEXTURE_SRC = "/texture/Front-Overlay.png";
const BACK_TEXTURE_SRC = "/texture/Back-Overlay.png";
const LOGO_SRC = "/logo/logo.png";

const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };
const BACK_VIEWBOX = { w: 622.13, h: 881.02 };
```

- [ ] **Step 3: Add calibration state**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
  const [embroideryText, setEmbroideryText] = useState("");
  const [embroideryPosition, setEmbroideryPosition] = useState<
    "top" | "bottom"
  >("top");
```

`new_string`:
```tsx
  const [embroideryText, setEmbroideryText] = useState("");
  const [embroideryPosition, setEmbroideryPosition] = useState<
    "top" | "bottom"
  >("top");

  const [frontCalibration] = useState<Calibration>(FRONT_CALIBRATION);
  const [backCalibration] = useState<Calibration>(BACK_CALIBRATION);
```

- [ ] **Step 4: Replace the bag containers**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
      {/* BAG */}
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div
          style={{
            position: "relative",
            height: 480,
            aspectRatio: "992.13 / 992.13",
          }}
        >
          <img
            src={FRONT_TEXTURE_SRC}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />
          <FrontSVG
            colors={colors}
            setSelectedPart={setSelectedPart}
            embroideryText={embroideryText}
            embroideryPosition={embroideryPosition}
          />
        </div>

        <div
          style={{
            position: "relative",
            height: 480,
            aspectRatio: "622.13 / 881.02",
          }}
        >
          <img
            src={BACK_TEXTURE_SRC}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
          />
          <BackSVG colors={colors} setSelectedPart={setSelectedPart} />
        </div>
      </div>
```

`new_string`:
```tsx
      {/* BAG */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div
          style={{
            position: "relative",
            width: 420,
            aspectRatio: `${FRONT_VIEWBOX.w} / ${FRONT_VIEWBOX.h}`,
          }}
        >
          <FrontSVG
            colors={colors}
            setSelectedPart={setSelectedPart}
            embroideryText={embroideryText}
            embroideryPosition={embroideryPosition}
          />
          <PngOverlayLayer
            viewBoxW={FRONT_VIEWBOX.w}
            viewBoxH={FRONT_VIEWBOX.h}
            pngSrc={FRONT_TEXTURE_SRC}
            calibration={frontCalibration}
          />
        </div>

        <div
          style={{
            position: "relative",
            width: 420,
            aspectRatio: `${BACK_VIEWBOX.w} / ${BACK_VIEWBOX.h}`,
          }}
        >
          <BackSVG colors={colors} setSelectedPart={setSelectedPart} />
          <PngOverlayLayer
            viewBoxW={BACK_VIEWBOX.w}
            viewBoxH={BACK_VIEWBOX.h}
            pngSrc={BACK_TEXTURE_SRC}
            calibration={backCalibration}
          />
        </div>
      </div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 6: Manual verify**

Run: `npm run dev` and open http://localhost:3000.
Expected:
- Page loads without errors in browser devtools console.
- Front container is square (~420×420). Back container is taller than wide (~420×~595), straps visible below the body area.
- Both PNG overlays render. The visual will look *wrong* at this point — the SVG fills are still 85% transparent so the blend multiplies onto a faded color, which is expected; Task 4 fixes that.
- Clicking a region still selects a group (check the summary table updates when you pick a color).

Kill the dev server (Ctrl-C).

- [ ] **Step 7: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: render PngOverlayLayer in place of img and switch containers to width-based sizing"
```

---

## Task 4: Flip layering — opaque SVG fills, embroidery above PNG

**Files:**
- Modify: `src/components/FrontSVG.tsx`
- Modify: `src/components/BackSVG.tsx`

- [ ] **Step 1: Change FrontSVG fill-opacity to 1**

Use Edit on `src/components/FrontSVG.tsx`:

`old_string`:
```tsx
          if (group && colors[group]) {
            path.setAttribute("fill", colors[group]);
            path.setAttribute("fill-opacity", "0.85");
          }
```

`new_string`:
```tsx
          if (group && colors[group]) {
            path.setAttribute("fill", colors[group]);
            path.setAttribute("fill-opacity", "1");
          }
```

- [ ] **Step 2: Raise embroidery zIndex above PNG overlay**

Use Edit on `src/components/FrontSVG.tsx`:

`old_string`:
```tsx
            width: "100%",
            height: "100%",
            zIndex: 3,
            pointerEvents: "none",
```

`new_string`:
```tsx
            width: "100%",
            height: "100%",
            zIndex: 4,
            pointerEvents: "none",
```

- [ ] **Step 3: Change BackSVG fill-opacity to 1**

Use Edit on `src/components/BackSVG.tsx`:

`old_string`:
```tsx
          if (group && colors[group]) {
            path.setAttribute("fill", colors[group]);
            path.setAttribute("fill-opacity", "0.85");
          }
```

`new_string`:
```tsx
          if (group && colors[group]) {
            path.setAttribute("fill", colors[group]);
            path.setAttribute("fill-opacity", "1");
          }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 5: Manual verify**

Run: `npm run dev` and open http://localhost:3000.
Expected:
- Pick any color in the palette, then click a region. The region fills in saturated solid color.
- The PNG's stitching / shadows / hardware are still visible on top of that color because `mix-blend-mode: multiply` composites the grayscale details onto the solid color underneath.
- White areas of the PNG are nearly invisible (white × color = color); dark areas of the PNG (seams, shadows) darken the color.
- Type some embroidery text — it appears crisp on top, not darkened by the PNG overlay.

Kill the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/FrontSVG.tsx src/components/BackSVG.tsx
git commit -m "feat: opaque SVG fills with PNG blended on top; embroidery above overlay"
```

---

## Task 5: CalibrationPanel component

**Files:**
- Create: `src/components/CalibrationPanel.tsx`

- [ ] **Step 1: Create the panel component**

Create `src/components/CalibrationPanel.tsx`:

```tsx
"use client";

import type { Calibration } from "@/lib/overlayCalibration";

type Props = {
  target: "front" | "back";
  calibration: Calibration;
  onChange: (next: Calibration) => void;
  debug: boolean;
  onDebugChange: (next: boolean) => void;
};

type Field = keyof Calibration;

const RANGES: Record<Field, { min: number; max: number; step: number }> = {
  translateX: { min: -500, max: 500, step: 1 },
  translateY: { min: -500, max: 500, step: 1 },
  scaleX: { min: 0.5, max: 2, step: 0.01 },
  scaleY: { min: 0.5, max: 2, step: 0.01 },
  rotation: { min: -45, max: 45, step: 0.1 },
};

const FIELDS: Field[] = [
  "translateX",
  "translateY",
  "scaleX",
  "scaleY",
  "rotation",
];

export default function CalibrationPanel({
  target,
  calibration,
  onChange,
  debug,
  onDebugChange,
}: Props) {
  const update = (field: Field, value: number) => {
    onChange({ ...calibration, [field]: value });
  };

  const copyJson = async () => {
    const json = JSON.stringify(calibration, null, 2);
    await navigator.clipboard.writeText(json);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        width: 300,
        padding: 16,
        background: "rgba(20,24,26,0.95)",
        color: "#fff",
        borderRadius: 8,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        zIndex: 10000,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>
        Calibrating: {target.toUpperCase()}
      </div>

      {FIELDS.map((field) => {
        const { min, max, step } = RANGES[field];
        return (
          <div key={field} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <label>{field}</label>
              <input
                type="number"
                value={calibration[field]}
                step={step}
                onChange={(e) => update(field, Number(e.target.value))}
                style={{
                  width: 80,
                  background: "#222",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: 3,
                  padding: "2px 4px",
                }}
              />
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={calibration[field]}
              onChange={(e) => update(field, Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        );
      })}

      <label
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginTop: 10,
        }}
      >
        <input
          type="checkbox"
          checked={debug}
          onChange={(e) => onDebugChange(e.target.checked)}
        />
        Debug overlay (50% opacity)
      </label>

      <button
        onClick={copyJson}
        style={{
          marginTop: 12,
          padding: "8px 12px",
          width: "100%",
          background: "#3757AA",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Copy JSON
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/CalibrationPanel.tsx
git commit -m "feat: add CalibrationPanel dev UI with sliders and Copy JSON"
```

---

## Task 6: Mount CalibrationPanel via URL query and wire calibration state

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add `useEffect` import and `CalibrationPanel` import**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
import { useState } from "react";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  type Calibration,
} from "@/lib/overlayCalibration";
```

`new_string`:
```tsx
import { useEffect, useState } from "react";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import CalibrationPanel from "@/components/CalibrationPanel";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  type Calibration,
} from "@/lib/overlayCalibration";
```

- [ ] **Step 2: Make calibration state writable and add target + debug state**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
  const [frontCalibration] = useState<Calibration>(FRONT_CALIBRATION);
  const [backCalibration] = useState<Calibration>(BACK_CALIBRATION);
```

`new_string`:
```tsx
  const [frontCalibration, setFrontCalibration] =
    useState<Calibration>(FRONT_CALIBRATION);
  const [backCalibration, setBackCalibration] =
    useState<Calibration>(BACK_CALIBRATION);
  const [calibrationTarget, setCalibrationTarget] = useState<
    "front" | "back" | null
  >(null);
  const [debugOverlay, setDebugOverlay] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("calibrate");
    if (target === "front" || target === "back") {
      setCalibrationTarget(target);
    }
  }, []);
```

- [ ] **Step 3: Pass `debug` prop to the matching PngOverlayLayer**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
          <PngOverlayLayer
            viewBoxW={FRONT_VIEWBOX.w}
            viewBoxH={FRONT_VIEWBOX.h}
            pngSrc={FRONT_TEXTURE_SRC}
            calibration={frontCalibration}
          />
```

`new_string`:
```tsx
          <PngOverlayLayer
            viewBoxW={FRONT_VIEWBOX.w}
            viewBoxH={FRONT_VIEWBOX.h}
            pngSrc={FRONT_TEXTURE_SRC}
            calibration={frontCalibration}
            debug={calibrationTarget === "front" && debugOverlay}
          />
```

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
          <PngOverlayLayer
            viewBoxW={BACK_VIEWBOX.w}
            viewBoxH={BACK_VIEWBOX.h}
            pngSrc={BACK_TEXTURE_SRC}
            calibration={backCalibration}
          />
```

`new_string`:
```tsx
          <PngOverlayLayer
            viewBoxW={BACK_VIEWBOX.w}
            viewBoxH={BACK_VIEWBOX.h}
            pngSrc={BACK_TEXTURE_SRC}
            calibration={backCalibration}
            debug={calibrationTarget === "back" && debugOverlay}
          />
```

- [ ] **Step 4: Mount the panel conditionally**

Use Edit on `src/app/page.tsx`:

`old_string`:
```tsx
      {/* SUMMARY */}
      <table style={{ color: "#fff", width: 500 }}>
        <tbody>
          {Object.entries(colors).map(([part, color]) => (
            <tr key={part}>
              <td>{getDisplayName(part)}</td>
              <td>{getColorName(color)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

`new_string`:
```tsx
      {/* SUMMARY */}
      <table style={{ color: "#fff", width: 500 }}>
        <tbody>
          {Object.entries(colors).map(([part, color]) => (
            <tr key={part}>
              <td>{getDisplayName(part)}</td>
              <td>{getColorName(color)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {calibrationTarget && (
        <CalibrationPanel
          target={calibrationTarget}
          calibration={
            calibrationTarget === "front" ? frontCalibration : backCalibration
          }
          onChange={
            calibrationTarget === "front"
              ? setFrontCalibration
              : setBackCalibration
          }
          debug={debugOverlay}
          onDebugChange={setDebugOverlay}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 6: Manual verify — normal mode**

Run: `npm run dev` and open http://localhost:3000 (no query string).
Expected:
- No calibration panel visible.
- Page works exactly as at the end of Task 4 (coloring, embroidery, summary table).

- [ ] **Step 7: Manual verify — calibrating front**

Open http://localhost:3000?calibrate=front.
Expected:
- Fixed panel appears in the top-right with "Calibrating: FRONT" header.
- Five slider+number pairs: translateX, translateY, scaleX, scaleY, rotation.
- Dragging translateX slides the Front PNG overlay horizontally in real time; other controls work similarly.
- Checking "Debug overlay" halves the Front PNG's opacity so you can see the SVG paths underneath; Back PNG is unaffected.
- Clicking "Copy JSON" writes the current calibration to the clipboard. Paste it into a scratch buffer and confirm it is valid JSON with exactly the five keys.

- [ ] **Step 8: Manual verify — calibrating back**

Open http://localhost:3000?calibrate=back.
Expected: same behavior but targets the Back overlay. The Front PNG is unaffected by the sliders or debug toggle.

- [ ] **Step 9: Manual verify — invalid query**

Open http://localhost:3000?calibrate=sideways.
Expected: no panel mounts; page looks identical to the no-query case.

Kill the dev server.

- [ ] **Step 10: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: mount CalibrationPanel via ?calibrate= query and wire state"
```

---

## Task 7: Delete unused SVGRenderer

**Files:**
- Delete: `src/components/SVGRenderer.tsx`

- [ ] **Step 1: Confirm nothing imports it**

Run: `rg -n 'SVGRenderer' src`
Expected: no matches (the file is not imported anywhere). If there are matches other than `src/components/SVGRenderer.tsx` itself, stop and investigate; do not delete.

- [ ] **Step 2: Delete the file**

Run: `rm src/components/SVGRenderer.tsx`

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no output.

- [ ] **Step 4: Update CLAUDE.md note about the removed file**

Use Edit on `CLAUDE.md`:

`old_string`:
```markdown
The `colors` state in `page.tsx` is keyed by the **logical group** (e.g. `BACK_MAIN`, `BAND`, `FRONT_BACK_SIDE`), not the raw SVG id. Many raw ids collapse into one group — e.g. `Back_Main_1` through `Back_Main_7` all map to `BACK_MAIN`, and both `Front_Side*` and `Back_Side*` deliberately merge into `FRONT_BACK_SIDE` so side panels stay consistent across views. The mapping lives in `getGroup()` inside each SVG component and **must be kept identical between `FrontSVG` and `BackSVG`** (there is also a `SVGRenderer.tsx` with a parallel but diverged taxonomy — it is not currently wired into `page.tsx`).
```

`new_string`:
```markdown
The `colors` state in `page.tsx` is keyed by the **logical group** (e.g. `BACK_MAIN`, `BAND`, `FRONT_BACK_SIDE`), not the raw SVG id. Many raw ids collapse into one group — e.g. `Back_Main_1` through `Back_Main_7` all map to `BACK_MAIN`, and both `Front_Side*` and `Back_Side*` deliberately merge into `FRONT_BACK_SIDE` so side panels stay consistent across views. The mapping lives in `getGroup()` inside each SVG component and **must be kept identical between `FrontSVG` and `BackSVG`**.
```

- [ ] **Step 5: Commit**

```bash
git add -u src/components/SVGRenderer.tsx CLAUDE.md
git commit -m "chore: remove unused SVGRenderer and update CLAUDE.md"
```

---

## Task 8: End-to-end verification

No code changes. Walk the spec's acceptance criteria once more with the feature fully wired.

- [ ] **Step 1: Dev server up**

Run: `npm run dev` and open http://localhost:3000.

- [ ] **Step 2: Click coverage — Front**

For each of these parts, pick a color from the palette, then click that region of the front bag. Confirm the region fills solid and the summary table row shows the right display name:
- Front Top Part (Front_Main_Top)
- Front Bottom Part (Front_Main_Bottom)
- Front Side Part left (Front_Side_L) and right (Front_Side_R) — both map to "Side Part"
- Side Panel ×6 (SidePanel_L1..L3, SidePanel_R1..R3) — all map to "Side Panel"
- Side Part (Side_Front)
- Band (Band_Top)
- Bottom

- [ ] **Step 3: Click coverage — Back**

Same exercise on the back bag:
- Back Central Part (Back_Main_1..Back_Main_7)
- Strap (Back_Strap_L, Back_Strap_R)
- Back Side Part (Back_Side_L, Back_Side_R) — map to "Side Part"
- Side Panel ×6 (SidePanel_L1..L3, SidePanel_R1..R3)
- Side Part (Side_L, Side_R)
- Band (Band_Top, Band_1..Band_6)
- Bottom

- [ ] **Step 4: Blend quality**

Pick a dark color on any part. Confirm you still see the PNG's stitching / shadows / seams darkening the color realistically (not a flat block). Pick a white-ish color (e.g., `Frost Gray`). Confirm the blend still shows shadow structure (multiplying near-white × gray PNG = near-gray, so shadows remain).

- [ ] **Step 5: Embroidery regression**

Type text in the embroidery field (if the UI for that exists in your current build; it is wired in `FrontSVG` but the text state setters are not yet exposed in the UI — if the field is not present, skip this step and note it). Toggle top/bottom position. Confirm text is crisp on top of the PNG overlay, not darkened by it.

Note: the embroidery text input controls are not present in `page.tsx`; the state is scaffolded but no input UI exists yet. Verifying embroidery requires either adding an input (out of scope) or temporarily hard-coding `embroideryText` in `page.tsx`. If skipped, record that embroidery was not verified in this run.

- [ ] **Step 6: Calibration round-trip**

Open `?calibrate=front`. Move translateX to 20 and rotation to 3. Click "Copy JSON". Paste into `src/lib/overlayCalibration.ts`:

```ts
export const FRONT_CALIBRATION: Calibration = {
  "translateX": 20,
  "translateY": 0,
  "scaleX": 1,
  "scaleY": 1,
  "rotation": 3
};
```

Reload the page with the query string cleared. Confirm the Front PNG renders with the new offset and rotation (matching what you saw with sliders). Revert the file:

```ts
export const FRONT_CALIBRATION: Calibration = { ...IDENTITY_CALIBRATION };
```

- [ ] **Step 7: Non-regression**

- Size toggle (14 / 16) still works.
- Color palette grid renders all 7 groups.
- Summary table updates on each color pick.

- [ ] **Step 8: Stop the server and report**

Kill the dev server. If everything above passed, the feature is complete. If anything failed, open an issue describing which step and the observed behavior.

---

## Self-review notes

Spec coverage check (§ = spec section):

- § Architecture → Tasks 2, 3, 4 (layer stack, container sizing, blend)
- § Calibration model → Task 1 (types), Task 2 (transform math)
- § Components "new files" → Tasks 1, 2, 5
- § Components "modified files" → Tasks 3, 4, 6
- § Components "deleted" → Task 7
- § Data flow → Tasks 3 and 6 (state wiring, URL query, clipboard round-trip)
- § Error handling → Task 1 (`IDENTITY_CALIBRATION` fallback), Task 2 (pointer-events none), Task 6 (invalid query ignored)
- § Verification → Task 8

Known gap: the embroidery text input UI is not present in `page.tsx` today; only the state setters exist. Task 8 Step 5 flags this explicitly rather than pretending it can be tested. Adding the input is out of scope for this plan.
