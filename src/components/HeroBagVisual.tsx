"use client";

import { useEffect, useRef } from "react";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import { FRONT_CALIBRATION } from "@/lib/overlayCalibration";

const FRONT_TEXTURE_SRC = "/texture/Front-Overlay.png";
const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };

// Five vertical bands, left → right. Two of the names the brand uses don't
// exist verbatim in COLOR_GROUPS — these are the closest matches:
//   "Ivory Dome"   → Ivory Dune (#FFF6DF)
//   "Frosted Gray" → Frost Gray (#F3F6F5)
const BANDS: string[] = [
  "#FFF6DF", // Ivory Dome (Ivory Dune)
  "#F3F6F5", // Frosted Gray (Frost Gray)
  "#384355", // Midnight Navy
  "#BBD8C6", // Mint Dust
  "#E7CEC8", // Rose Blush
];

const GRADIENT_ID = "heroBands";

const GROUP_PREFIXES: Array<[string, string]> = [
  ["Front_Side", "FRONT_BACK_SIDE"],
  ["Front_Main_Bottom", "FRONT_MAIN_BOTTOM"],
  ["Front_Main_Top", "FRONT_MAIN_TOP"],
  ["Band", "BAND"],
];

const PAINTABLE_GROUPS = new Set([
  "FRONT_BACK_SIDE",
  "FRONT_MAIN_BOTTOM",
  "FRONT_MAIN_TOP",
  "BAND",
]);

const normalizeId = (id: string) => id.replace(/_x5F_/g, "_");

const matchPrefix = (id: string): string | null => {
  if (!id) return null;
  for (const [prefix, group] of GROUP_PREFIXES) {
    if (id.startsWith(prefix)) return group;
  }
  return null;
};

const resolveGroup = (el: Element): string | null => {
  let cur: Element | null = el;
  while (cur && cur.tagName.toLowerCase() !== "svg") {
    const id = normalizeId(cur.getAttribute("id") || "");
    const group = matchPrefix(id);
    if (group) return group;
    cur = cur.parentElement;
  }
  return null;
};

// Hard-edge stop sequence: each color gets two adjacent stops at the same
// offset (one closing the previous band, one opening the next), which renders
// as a sharp boundary instead of a smooth gradient.
function buildStops(colors: string[]): string {
  const n = colors.length;
  const segPct = 100 / n;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const start = (segPct * i).toFixed(4);
    const end = (segPct * (i + 1)).toFixed(4);
    parts.push(`<stop offset="${start}%" stop-color="${colors[i]}"/>`);
    parts.push(`<stop offset="${end}%" stop-color="${colors[i]}"/>`);
  }
  return parts.join("");
}

export default function HeroBagVisual() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/LaptopBackpack_16_Front.svg")
      .then((r) => r.text())
      .then((data) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = data;
        const svg = ref.current.querySelector("svg") as SVGSVGElement | null;
        if (!svg) return;

        svg.querySelector("#Front_x5F_Logo, #Front_Logo")?.remove();
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.display = "block";

        // Collect paintable paths and measure their combined horizontal
        // extent so the gradient bands distribute across the bag itself,
        // not the empty viewBox margins.
        const paths = svg.querySelectorAll<SVGPathElement>("path");
        const paintable: SVGPathElement[] = [];
        let minX = Infinity;
        let maxX = -Infinity;
        paths.forEach((p) => {
          const g = resolveGroup(p);
          if (!g || !PAINTABLE_GROUPS.has(g)) return;
          paintable.push(p);
          try {
            const b = p.getBBox();
            if (b.width > 0) {
              if (b.x < minX) minX = b.x;
              if (b.x + b.width > maxX) maxX = b.x + b.width;
            }
          } catch {
            // getBBox can throw on not-yet-rendered paths; safe to skip.
          }
        });
        if (!isFinite(minX) || !isFinite(maxX) || maxX <= minX) {
          minX = 0;
          maxX = FRONT_VIEWBOX.w;
        }

        const ns = "http://www.w3.org/2000/svg";
        const defs = document.createElementNS(ns, "defs");
        defs.innerHTML = `
          <linearGradient id="${GRADIENT_ID}"
            gradientUnits="userSpaceOnUse"
            x1="${minX}" y1="0" x2="${maxX}" y2="0">
            ${buildStops(BANDS)}
          </linearGradient>`;
        svg.insertBefore(defs, svg.firstChild);

        paintable.forEach((p) => {
          p.setAttribute("fill", `url(#${GRADIENT_ID})`);
          p.setAttribute("fill-opacity", "1");
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
        }}
      />
      <PngOverlayLayer
        viewBoxW={FRONT_VIEWBOX.w}
        viewBoxH={FRONT_VIEWBOX.h}
        pngSrc={FRONT_TEXTURE_SRC}
        calibration={FRONT_CALIBRATION}
      />
    </div>
  );
}
