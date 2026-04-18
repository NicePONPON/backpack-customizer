"use client";

import { useEffect, useRef } from "react";

export default function FrontSVG({
  colors,
  setSelectedPart,
  embroideryText,
  embroideryPosition,
  embroideryColor = "#F5F5F5",
}: any) {
  const ref = useRef<HTMLDivElement>(null);

  // ✅ 保留原始邏輯 + 只改 Side 合併
  const getGroup = (id: string) => {
    if (!id) return null;

    // 🔴 這是你指定要合併的
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
    fetch("/LaptopBackpack_16_Front.svg")
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

          // 👉 透明可點擊（超重要）
          if (
            !path.getAttribute("fill") ||
            path.getAttribute("fill") === "none"
          ) {
            path.setAttribute("fill", "rgba(0,0,0,0.01)");
          }

          path.style.pointerEvents = "all";
          path.style.cursor = "pointer";

          // 👉 上色
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

  // 👉 刺繡位置
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

      {/* ✨ 刺繡層 */}
      {embroideryText && (
        <svg
          viewBox="0 0 992.13 992.13"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
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
