"use client";

import { useEffect, useRef } from "react";

export default function SVGRenderer({ svgPath, colors, setSelectedPart }: any) {
  const ref = useRef<HTMLDivElement>(null);

  // 🎯 分類 + 合併邏輯
  const getGroup = (id: string) => {
    if (!id) return null;

    if (id.startsWith("Back_Main")) return "BACK_MAIN";

    if (id.startsWith("Back_Strap")) return "BACK_STRAP";

    if (id.startsWith("Band")) return "BAND";

    // 🔥 合併 Front / Back Side
    if (id.startsWith("Back_Side") || id.startsWith("Front_Side"))
      return "SIDE";

    if (id.startsWith("Bottom")) return "BOTTOM";

    if (id.startsWith("Side_")) return "SIDE";

    if (id.startsWith("SidePanel")) return "PANEL";

    if (id.startsWith("Front_Main_Bottom")) return "FRONT_MAIN_BOTTOM";

    if (id.startsWith("Front_Main_Top")) return "FRONT_MAIN_TOP";

    return null;
  };

  useEffect(() => {
    fetch(svgPath)
      .then((res) => res.text())
      .then((data) => {
        if (!ref.current) return;

        ref.current.innerHTML = data;

        const svg = ref.current.querySelector("svg");
        if (!svg) return;

        // ✅ 對齊
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

          // ✅ 沒 fill 的區域也能點擊
          if (
            !path.getAttribute("fill") ||
            path.getAttribute("fill") === "none"
          ) {
            path.setAttribute("fill", "rgba(0,0,0,0.01)");
          }

          path.style.pointerEvents = "all";

          // 🎨 上色（含透明度）
          if (group && colors[group]) {
            path.setAttribute("fill", colors[group]);
            path.setAttribute("fill-opacity", "0.75"); // 🔥 fabric感
          } else {
            path.setAttribute("fill-opacity", "0.25"); // 未上色淡
          }

          // 🖱️ hover 效果（很關鍵）
          path.onmouseenter = () => {
            path.style.opacity = "0.8";
          };

          path.onmouseleave = () => {
            path.style.opacity = "1";
          };

          // 🖱️ 點擊
          path.onclick = () => {
            if (group) setSelectedPart(group);
          };
        });
      });
  }, [svgPath, colors]);

  return <div ref={ref} />;
}
