"use client";

import { useEffect, useRef, useState } from "react";
import type { ZipperCalibration } from "@/lib/overlayCalibration";

const GROUP_PREFIXES: Array<[string, string]> = [
  ["Front_Side", "FRONT_BACK_SIDE"],
  ["Back_Side", "FRONT_BACK_SIDE"],
  ["Front_Main_Bottom", "FRONT_MAIN_BOTTOM"],
  ["Front_Main_Top", "FRONT_MAIN_TOP"],
  ["Back_Main", "BACK_MAIN"],
  ["Back_Strap", "BACK_STRAP"],
  ["Band", "BAND"],
  ["Bottom", "BOTTOM"],
  ["SidePanel", "SIDE_PANEL"],
  ["Side_", "SIDE"],
];

// Illustrator exports sometimes encode underscores inside ids as `_x5F_`.
const normalizeId = (id: string) => id.replace(/_x5F_/g, "_");

const matchPrefix = (id: string): string | null => {
  if (!id) return null;
  for (const [prefix, group] of GROUP_PREFIXES) {
    if (id.startsWith(prefix)) return group;
  }
  return null;
};

// Walk ancestors because the meaningful id may be several <g> levels up
// (Illustrator can wrap paths in uuid-named groups that match nothing).
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

// 50%-darker same-hue shadow for the embroidery halo.
function darken(hex: string, ratio: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - ratio));
  const g = Math.round(((n >> 8) & 0xff) * (1 - ratio));
  const b = Math.round((n & 0xff) * (1 - ratio));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

type Box = { x: number; y: number; width: number; height: number };

type LineSize = "small" | "medium" | "large";

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
  zipperCalibration: ZipperCalibration;
  flashGroup?: string | null;
  flashNonce?: number;
};

const SIZE_PX: Record<LineSize, number> = {
  small: 32,
  medium: 48,
  large: 72,
};

const FONT_FAMILY: Record<"serif" | "sans-serif", string> = {
  serif: "Georgia, 'Times New Roman', serif",
  "sans-serif": "Arial, Helvetica, sans-serif",
};

const STROKE_WIDTH = 3;

const ZIPPER_PNG_SRC = "/texture/Zipper-Overlay.png";
const ZIPPER_PULL_WIDTH = 208;
const ZIPPER_PULL_HEIGHT = 416;

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
  zipperCalibration,
  flashGroup,
  flashNonce,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pathsRef = useRef<NodeListOf<SVGPathElement> | null>(null);
  const colorsRef = useRef(colors);
  const [topBox, setTopBox] = useState<Box | null>(null);
  const [bottomBox, setBottomBox] = useState<Box | null>(null);

  useEffect(() => {
    colorsRef.current = colors;
  }, [colors]);

  // One-time: fetch SVG, inject, bind clicks, measure bbox.
  useEffect(() => {
    let cancelled = false;
    fetch("/LaptopBackpack_16_Front.svg")
      .then((res) => res.text())
      .then((data) => {
        if (cancelled || !ref.current) return;

        ref.current.innerHTML = data;

        const svg = ref.current.querySelector("svg");
        if (!svg) return;

        svg.querySelector("#Front_x5F_Logo, #Front_Logo")?.remove();

        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";

        const paths = svg.querySelectorAll<SVGPathElement>("path");

        paths.forEach((path) => {
          const group = resolveGroup(path);

          if (
            !path.getAttribute("fill") ||
            path.getAttribute("fill") === "none"
          ) {
            path.setAttribute("fill", "rgba(0,0,0,0.01)");
          }

          path.style.pointerEvents = "all";
          path.style.cursor = "pointer";

          path.onclick = () => {
            if (group) setSelectedPart(group);
          };
        });

        pathsRef.current = paths;
        applyColors(paths, colorsRef.current);

        const top = svg.querySelector(
          "#Front_x5F_Main_x5F_Top1, #Front_Main_Top1"
        ) as SVGGraphicsElement | null;
        const bottom = svg.querySelector(
          "#Front_x5F_Main_x5F_Bottom1, #Front_Main_Bottom1"
        ) as SVGGraphicsElement | null;
        if (top) {
          const b = top.getBBox();
          setTopBox({ x: b.x, y: b.y, width: b.width, height: b.height });
        }
        if (bottom) {
          const b = bottom.getBBox();
          setBottomBox({ x: b.x, y: b.y, width: b.width, height: b.height });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply fills on color change.
  useEffect(() => {
    if (pathsRef.current) applyColors(pathsRef.current, colors);
  }, [colors]);

  // Shine the paths belonging to the just-painted group. flashNonce is
  // included so clicking the same group repeatedly restarts the animation.
  useEffect(() => {
    const paths = pathsRef.current;
    if (!paths) return;
    paths.forEach((p) => {
      const g = resolveGroup(p);
      p.classList.remove("paint-flash");
      if (g && g === flashGroup) {
        // Force reflow so the animation restarts on re-trigger.
        void (p as unknown as HTMLElement).getBoundingClientRect();
        p.classList.add("paint-flash");
      }
    });
  }, [flashGroup, flashNonce]);

  const box = embroideryPosition === "top" ? topBox : bottomBox;
  const visibleLines =
    embroideryLineCount === 1
      ? [embroideryLines[0]]
      : [embroideryLines[0], embroideryLines[1]];
  const hasText = visibleLines.some((l) => l.trim().length > 0);

  const shadowColor = darken(embroideryColor, 0.5);

  let rendered: React.ReactNode = null;
  if (box && hasText) {
    const centerX = box.x + box.width / 2;
    const maxTextWidth = box.width / 2;
    const anchorY =
      embroideryPosition === "top"
        ? box.y + box.height / 2
        : box.y + box.height * 0.85;

    const fontSizes = visibleLines.map((_, i) => SIZE_PX[embroideryLineSizes[i]]);
    const totalHeight = fontSizes.reduce((s, fs) => s + fs * 1.2, 0);
    let cursorY = anchorY - totalHeight / 2;

    rendered = visibleLines.map((line, i) => {
      const fs = fontSizes[i];
      const lineHeight = fs * 1.2;
      const lineY =
        embroideryLineCount === 1 ? anchorY : cursorY + lineHeight / 2;
      cursorY += lineHeight;

      if (!line.trim()) return null;

      const estimatedWidth = line.length * fs * 0.55;
      const needsFit = estimatedWidth > maxTextWidth;

      return (
        <text
          key={i}
          x={centerX}
          y={lineY}
          fill={embroideryColor}
          stroke={shadowColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinejoin="round"
          paintOrder="stroke"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fs}
          fontWeight={700}
          fontFamily={FONT_FAMILY[embroideryFont]}
          textLength={needsFit ? maxTextWidth : undefined}
          lengthAdjust={needsFit ? "spacingAndGlyphs" : undefined}
        >
          {line}
        </text>
      );
    });
  }

  const pullPositions =
    zipperUpgrade && topBox
      ? (() => {
          const anchorX = topBox.x + topBox.width / 2;
          const anchorY = topBox.y;
          const {
            leftX,
            leftY,
            leftRotation,
            rightX,
            rightY,
            rightRotation,
          } = zipperCalibration;
          return [
            {
              key: "left" as const,
              x: anchorX + leftX - ZIPPER_PULL_WIDTH / 2,
              y: anchorY + leftY - ZIPPER_PULL_HEIGHT / 2,
              rotation: leftRotation,
            },
            {
              key: "right" as const,
              x: anchorX + rightX - ZIPPER_PULL_WIDTH / 2,
              y: anchorY + rightY - ZIPPER_PULL_HEIGHT / 2,
              rotation: rightRotation,
            },
          ];
        })()
      : null;

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
            pullPositions.map((p) => {
              const cx = p.x + ZIPPER_PULL_WIDTH / 2;
              const cy = p.y + ZIPPER_PULL_HEIGHT / 2;
              return (
                <g
                  key={p.key}
                  transform={`rotate(${p.rotation} ${cx} ${cy})`}
                >
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
              );
            })}

          {rendered}
        </svg>
      )}
    </>
  );
}

function applyColors(
  paths: NodeListOf<SVGPathElement>,
  colors: Record<string, string>,
) {
  paths.forEach((path) => {
    const group = resolveGroup(path);
    if (group && colors[group]) {
      path.setAttribute("fill", colors[group]);
      path.setAttribute("fill-opacity", "1");
    }
  });
}
