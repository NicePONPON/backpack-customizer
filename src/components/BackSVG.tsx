"use client";

import { useEffect, useRef } from "react";
import {
  BACK_SVG_TRANSFORM,
  buildCalibrationTransform,
} from "@/lib/overlayCalibration";

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

export default function BackSVG({ colors, setSelectedPart }: any) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/LaptopBackpack_16_Back.svg")
      .then((res) => res.text())
      .then((data) => {
        if (!ref.current) return;

        ref.current.innerHTML = data;

        const svg = ref.current.querySelector("svg");
        if (!svg) return;

        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";

        const vb = svg.viewBox.baseVal;
        const wrapper = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g",
        );
        wrapper.setAttribute(
          "transform",
          buildCalibrationTransform(BACK_SVG_TRANSFORM, vb.width, vb.height),
        );
        while (svg.firstChild) {
          wrapper.appendChild(svg.firstChild);
        }
        svg.appendChild(wrapper);

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

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
      }}
    />
  );
}
