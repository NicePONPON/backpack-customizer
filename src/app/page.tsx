"use client";

import { useEffect, useState } from "react";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import CalibrationPanel from "@/components/CalibrationPanel";
import EmbroideryControls, {
  type EmbroideryColor,
  type EmbroideryPosition,
} from "@/components/EmbroideryControls";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  type Calibration,
} from "@/lib/overlayCalibration";

const FRONT_TEXTURE_SRC = "/texture/Front-Overlay.png";
const BACK_TEXTURE_SRC = "/texture/Back-Overlay.png";
const LOGO_SRC = "/logo/logo.png";

const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };
const BACK_VIEWBOX = { w: 622.13, h: 881.02 };

const BASE_CONTAINER_WIDTH = 420;
const SIZE_SCALE: Record<"14" | "16", number> = {
  "14": 14 / 16,
  "16": 1,
};

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

  const [embroideryLines, setEmbroideryLines] = useState<[string, string]>([
    "",
    "",
  ]);
  const [embroideryLineCount, setEmbroideryLineCount] = useState<1 | 2>(1);
  const [embroideryColor, setEmbroideryColor] =
    useState<EmbroideryColor>("#000000");
  const [embroideryPosition, setEmbroideryPosition] =
    useState<EmbroideryPosition>("top");

  const [frontCalibration, setFrontCalibration] =
    useState<Calibration>(FRONT_CALIBRATION);
  const [backCalibration, setBackCalibration] =
    useState<Calibration>(BACK_CALIBRATION);
  const [calibrationTarget, setCalibrationTarget] = useState<
    "front" | "back" | null
  >(null);
  const [debugOverlay, setDebugOverlay] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("calibrate");
    if (target === "front" || target === "back") {
      setCalibrationTarget(target);
    }
  }, []);

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
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div
          style={{
            position: "relative",
            width: BASE_CONTAINER_WIDTH * SIZE_SCALE[size],
            aspectRatio: `${FRONT_VIEWBOX.w} / ${FRONT_VIEWBOX.h}`,
          }}
        >
          <FrontSVG
            colors={colors}
            setSelectedPart={setSelectedPart}
            embroideryLines={embroideryLines}
            embroideryLineCount={embroideryLineCount}
            embroideryColor={embroideryColor}
            embroideryPosition={embroideryPosition}
          />
          <PngOverlayLayer
            viewBoxW={FRONT_VIEWBOX.w}
            viewBoxH={FRONT_VIEWBOX.h}
            pngSrc={FRONT_TEXTURE_SRC}
            calibration={frontCalibration}
            debug={calibrationTarget === "front" && debugOverlay}
          />
        </div>

        <div
          style={{
            position: "relative",
            width: BASE_CONTAINER_WIDTH * SIZE_SCALE[size],
            aspectRatio: `${BACK_VIEWBOX.w} / ${BACK_VIEWBOX.h}`,
          }}
        >
          <BackSVG colors={colors} setSelectedPart={setSelectedPart} />
          <PngOverlayLayer
            viewBoxW={BACK_VIEWBOX.w}
            viewBoxH={BACK_VIEWBOX.h}
            pngSrc={BACK_TEXTURE_SRC}
            calibration={backCalibration}
            debug={calibrationTarget === "back" && debugOverlay}
          />
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

      <EmbroideryControls
        lines={embroideryLines}
        lineCount={embroideryLineCount}
        color={embroideryColor}
        position={embroideryPosition}
        onLinesChange={setEmbroideryLines}
        onLineCountChange={setEmbroideryLineCount}
        onColorChange={setEmbroideryColor}
        onPositionChange={setEmbroideryPosition}
      />

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

      {calibrationTarget && (
        <CalibrationPanel
          target={calibrationTarget}
          calibration={
            calibrationTarget === "front" ? frontCalibration : backCalibration
          }
          onChange={
            calibrationTarget === "front"
              ? setFrontCalibration
              : setBackCalibration
          }
          debug={debugOverlay}
          onDebugChange={setDebugOverlay}
        />
      )}
    </main>
  );
}
