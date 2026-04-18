"use client";

import { useState } from "react";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";

const FRONT_TEXTURE_SRC = "/texture/Front-Overlay.png";
const BACK_TEXTURE_SRC = "/texture/Back-Overlay.png";
const LOGO_SRC = "/logo/logo.png";

const COLOR_GROUPS = [
  {
    title: "Core Dark",
    colors: [
      { name: "Charcoal Abyss", value: "#14181A" },
      { name: "Midnight Navy", value: "#384355" },
      { name: "Eclipse Blue", value: "#1C264C" },
      { name: "Nocturne Blue", value: "#28345D" },
      { name: "Regal Tide", value: "#3757AA" },
      { name: "Iced Horizon", value: "#9DB5DA" },
    ],
  },
  {
    title: "Nature Greens",
    colors: [
      { name: "Pine Smoke", value: "#3F5759" },
      { name: "Moss Dusk", value: "#436D62" },
      { name: "Tideglass Blues", value: "#6B9DA7" },
      { name: "Aqua Grove", value: "#5AAEAD" },
      { name: "Mint Dust", value: "#BBD8C6" },
      { name: "Glacial Mint", value: "#F1FFF6" },
    ],
  },
  {
    title: "Light Greens & Yellow",
    colors: [
      { name: "Olive Cream", value: "#D6D9AF" },
      { name: "Lemon Fern", value: "#D7E470" },
      { name: "Butter Glow", value: "#F0E196" },
      { name: "Lime Dew", value: "#E9F7A4" },
      { name: "Vanilla Flare", value: "#FEFCC1" },
      { name: "Ivory Dune", value: "#FFF6DF" },
    ],
  },
  {
    title: "Earth & Brown",
    colors: [
      { name: "Cocoa Drift", value: "#846855" },
      { name: "Rust Ember", value: "#A96341" },
      { name: "Honey Clay", value: "#DDB683" },
      { name: "Faded Almond", value: "#C3B39C" },
      { name: "Golden Wheat", value: "#E6CFA6" },
      { name: "Stone Oat", value: "#DED6BF" },
    ],
  },
  {
    title: "Warm / Red",
    colors: [
      { name: "Cinnamon Clay", value: "#95494C" },
      { name: "Wine Ember", value: "#91343D" },
      { name: "Chili Flame", value: "#D84243" },
      { name: "Apricot Dust", value: "#F1AB7F" },
      { name: "Desert Blush", value: "#EF9896" },
      { name: "Bare Petal", value: "#FEE4DD" },
    ],
  },
  {
    title: "Soft / Neutral",
    colors: [
      { name: "Lavender Mist", value: "#C2BAC7" },
      { name: "Winter Azure", value: "#BCCFE3" },
      { name: "Rose Blush", value: "#E7CEC8" },
      { name: "Feather Rose", value: "#EFE0E5" },
      { name: "Biscuit Beige", value: "#E9CCAD" },
      { name: "Sunlit Cotton", value: "#FEFAE5" },
    ],
  },
  {
    title: "Gray Scale",
    colors: [
      { name: "Ash Steel", value: "#727576" },
      { name: "Frost Gray", value: "#F3F6F5" },
      { name: "Blushed Snow", value: "#FFFDFE" },
    ],
  },
];

export default function Page() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [size, setSize] = useState<"14" | "16">("14");

  const [embroideryText, setEmbroideryText] = useState("");
  const [embroideryPosition, setEmbroideryPosition] = useState<
    "top" | "bottom"
  >("top");

  const handleColorClick = (color: string) => {
    if (!selectedPart) return;
    setColors((prev) => ({
      ...prev,
      [selectedPart]: color,
    }));
  };

  // ✅ 顯示名稱（已支援新 group）
  const getDisplayName = (part: string | null) => {
    if (!part) return "None";

    if (part === "FRONT_BACK_SIDE") return "Side Part";

    if (part.startsWith("Back_Main")) return "Back Central Part";
    if (part.startsWith("Back_Strap")) return "Strap";
    if (part.startsWith("Band")) return "Band";
    if (part.startsWith("Back_Side")) return "Back Side Part";
    if (part.startsWith("Bottom")) return "Bottom";
    if (part.startsWith("SidePanel")) return "Side Panel";
    if (part.startsWith("Side_")) return "Side Part";
    if (part.startsWith("Front_Main_Bottom")) return "Front Bottom Part";
    if (part.startsWith("Front_Main_Top")) return "Front Top Part";
    if (part.startsWith("Front_Side")) return "Front Side Part";

    return part;
  };

  const getColorName = (hex: string) => {
    for (const group of COLOR_GROUPS) {
      const found = group.colors.find((c) => c.value === hex);
      if (found) return found.name;
    }
    return hex;
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(#555555, #222222)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 24px 48px",
        gap: 28,
      }}
    >
      <img src={LOGO_SRC} style={{ height: 80 }} />

      {/* SIZE */}
      <div style={{ display: "flex", gap: 10 }}>
        {(["14", "16"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            style={{
              padding: "8px 22px",
              borderRadius: 999,
              background: size === s ? "#fff" : "transparent",
              color: size === s ? "#111" : "#fff",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            {s} inch
          </button>
        ))}
      </div>

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

      {/* COLOR */}
      <div style={{ width: "100%", maxWidth: 900 }}>
        {COLOR_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: 24 }}>
            <div
              style={{ color: "#fff", textAlign: "center", marginBottom: 10 }}
            >
              {group.title}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 14,
              }}
            >
              {group.colors.map((color) => (
                <div
                  key={color.value}
                  onClick={() => handleColorClick(color.value)}
                  style={{ textAlign: "center", cursor: "pointer" }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: color.value,
                      margin: "0 auto",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#e4e4e4" }}>
                    {color.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
