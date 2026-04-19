"use client";

import { useEffect, useRef } from "react";

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

export default function FrontSVG({
  colors,
  setSelectedPart,
  embroideryText,
  embroideryPosition,
  embroideryColor = "#F5F5F5",
}: any) {
  const ref = useRef<HTMLDivElement>(null);

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
      });
  }, [colors]);

  const embroideryY = embroideryPosition === "top" ? 380 : 760;

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

      {embroideryText && (
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
          <text
            x="50%"
            y={embroideryY}
            textAnchor="middle"
            fontSize="34"
            fontWeight="700"
            fill={embroideryColor}
            style={{
              fontFamily: "Arial",
              letterSpacing: "1px",
              textShadow: "0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            {embroideryText}
          </text>
        </svg>
      )}
    </>
  );
}
