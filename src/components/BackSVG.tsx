"use client";

import { useEffect, useRef } from "react";
import {
  buildCalibrationTransform,
  type Calibration,
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

type Props = {
  colors: Record<string, string>;
  setSelectedPart: (part: string) => void;
  svgTransform: Calibration;
  flashGroup?: string | null;
  flashNonce?: number;
};

export default function BackSVG({
  colors,
  setSelectedPart,
  svgTransform,
  flashGroup,
  flashNonce,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<SVGGElement | null>(null);
  const pathsRef = useRef<NodeListOf<SVGPathElement> | null>(null);

  // One-time: fetch SVG, wrap content in a <g>, bind clicks.
  useEffect(() => {
    let cancelled = false;
    fetch("/LaptopBackpack_16_Back.svg")
      .then((res) => res.text())
      .then((data) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = data;
        const svg = ref.current.querySelector("svg") as SVGSVGElement | null;
        if (!svg) return;

        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";

        const wrapper = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g",
        );
        while (svg.firstChild) wrapper.appendChild(svg.firstChild);
        svg.appendChild(wrapper);

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

        svgRef.current = svg;
        wrapperRef.current = wrapper;
        pathsRef.current = paths;

        applyColors(paths, colors);
        applyTransform(svg, wrapper, svgTransform);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update fills on color change.
  useEffect(() => {
    if (pathsRef.current) applyColors(pathsRef.current, colors);
  }, [colors]);

  // Update wrapper transform on slider change.
  useEffect(() => {
    if (svgRef.current && wrapperRef.current) {
      applyTransform(svgRef.current, wrapperRef.current, svgTransform);
    }
  }, [svgTransform]);

  // Shine the paths belonging to the just-painted group. flashNonce is
  // included so clicking the same group repeatedly restarts the animation.
  useEffect(() => {
    const paths = pathsRef.current;
    if (!paths) return;
    paths.forEach((p) => {
      const g = resolveGroup(p);
      p.classList.remove("paint-flash");
      if (g && g === flashGroup) {
        void (p as unknown as HTMLElement).getBoundingClientRect();
        p.classList.add("paint-flash");
      }
    });
  }, [flashGroup, flashNonce]);

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

function applyTransform(
  svg: SVGSVGElement,
  wrapper: SVGGElement,
  cal: Calibration,
) {
  const vb = svg.viewBox.baseVal;
  wrapper.setAttribute(
    "transform",
    buildCalibrationTransform(cal, vb.width, vb.height),
  );
}
