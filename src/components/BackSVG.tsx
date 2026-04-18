"use client";

import { useEffect, useRef } from "react";

export default function BackSVG({ colors, setSelectedPart }: any) {
  const ref = useRef<HTMLDivElement>(null);

  // ✅ 與 FrontSVG 完全一致（關鍵）
  const getGroup = (id: string) => {
    if (!id) return null;

    // 🔴 合併 Front / Back Side
    if (id.startsWith("Front_Side")) return "FRONT_BACK_SIDE";
    if (id.startsWith("Back_Side")) return "FRONT_BACK_SIDE";

    if (id.startsWith("Front_Main_Bottom")) return "FRONT_MAIN_BOTTOM";
    if (id.startsWith("Front_Main_Top")) return "FRONT_MAIN_TOP";

    if (id.startsWith("Back_Main")) return "BACK_MAIN";
    if (id.startsWith("Back_Strap")) return "BACK_STRAP";

    if (id.startsWith("Band")) return "BAND";

    if (id.startsWith("Bottom")) return "BOTTOM";

    if (id.startsWith("SidePanel")) return "SIDE_PANEL";

    if (id.startsWith("Side_")) return "SIDE";

    return null;
  };

  useEffect(() => {
    fetch("/LaptopBackpack_16_Back.svg")
      .then((res) => res.text())
      .then((data) => {
        if (!ref.current) return;

        ref.current.innerHTML = data;

        const svg = ref.current.querySelector("svg");
        if (!svg) return;

        // ✅ 對齊（避免跑版）
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";

        const paths = svg.querySelectorAll("path");

        paths.forEach((path: any) => {
          const id = path.closest("g")?.id || path.getAttribute("id") || "";

          const group = getGroup(id);

          // 👉 讓透明區也能點擊（超關鍵）
          if (
            !path.getAttribute("fill") ||
            path.getAttribute("fill") === "none"
          ) {
            path.setAttribute("fill", "rgba(0,0,0,0.01)");
          }

          path.style.pointerEvents = "all";
          path.style.cursor = "pointer";

          // 👉 套色
          if (group && colors[group]) {
            path.setAttribute("fill", colors[group]);
            path.setAttribute("fill-opacity", "0.85");
          }

          // 👉 點擊
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
