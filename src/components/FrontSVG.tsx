"use client";

import { useEffect, useRef, useState } from "react";

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

type Props = {
  colors: Record<string, string>;
  setSelectedPart: (part: string) => void;
  embroideryLines: [string, string];
  embroideryLineCount: 1 | 2;
  embroideryColor: string;
  embroideryPosition: "top" | "bottom";
};

const BASE_FONT_SIZE = 48;
const LINE_GAP = BASE_FONT_SIZE * 1.2;

export default function FrontSVG({
  colors,
  setSelectedPart,
  embroideryLines,
  embroideryLineCount,
  embroideryColor,
  embroideryPosition,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [topBox, setTopBox] = useState<Box | null>(null);
  const [bottomBox, setBottomBox] = useState<Box | null>(null);

  useEffect(() => {
    fetch("/LaptopBackpack_16_Front.svg")
      .then((res) => res.text())
      .then((data) => {
        if (!ref.current) return;

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

        const paths = svg.querySelectorAll("path");

        paths.forEach((path: any) => {
          const group = resolveGroup(path);

          if (
            !path.getAttribute("fill") ||
            path.getAttribute("fill") === "none"
          ) {
            path.setAttribute("fill", "rgba(0,0,0,0.01)");
          }

          path.style.pointerEvents = "all";
          path.style.cursor = "pointer";

          if (group && colors[group]) {
            path.setAttribute("fill", colors[group]);
            path.setAttribute("fill-opacity", "1");
          }

          path.onclick = () => {
            if (group) setSelectedPart(group);
          };
        });

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
  }, [colors]);

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

    rendered = visibleLines.map((line, i) => {
      if (!line.trim()) return null;
      const lineY =
        embroideryLineCount === 1
          ? anchorY
          : anchorY + (i === 0 ? -LINE_GAP / 2 : LINE_GAP / 2);
      const commonProps = {
        textAnchor: "middle" as const,
        dominantBaseline: "middle" as const,
        fontSize: BASE_FONT_SIZE,
        fontWeight: 700,
        fontFamily: "Arial",
        textLength: maxTextWidth,
        lengthAdjust: "spacingAndGlyphs" as const,
      };
      return (
        <g key={i}>
          <text x={centerX + 2} y={lineY + 2} fill={shadowColor} {...commonProps}>
            {line}
          </text>
          <text x={centerX} y={lineY} fill={embroideryColor} {...commonProps}>
            {line}
          </text>
        </g>
      );
    });
  }

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

      {rendered && (
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
          {rendered}
        </svg>
      )}
    </>
  );
}
