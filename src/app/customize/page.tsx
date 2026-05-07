"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import BagDimensionGuides from "@/components/BagDimensionGuides";
import CalibrationPanel from "@/components/CalibrationPanel";
import ZipperCalibrationPanel from "@/components/ZipperCalibrationPanel";
import EmbroideryControls, {
  type EmbroideryColor,
  type EmbroideryFont,
  type EmbroideryPosition,
  type EmbroideryLineSize,
} from "@/components/EmbroideryControls";
import ZipperPullControls, {
  ZIPPER_COLORS,
} from "@/components/ZipperPullControls";
import PriceDashboard from "@/components/PriceDashboard";
import SizeVisualizer from "@/components/SizeVisualizer";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  BACK_SVG_TRANSFORM,
  ZIPPER_CALIBRATION,
  type Calibration,
  type ZipperCalibration,
} from "@/lib/overlayCalibration";
import { COLOR_GROUPS } from "@/lib/bagReference";
import { encodeDesign, decodeDesign } from "@/lib/invoiceSerialization";
import SaveDesignModal from "@/components/SaveDesignModal";
import { useTheme } from "@/lib/ThemeContext";

const FRONT_TEXTURE_SRC = "/texture/Front-Overlay.png";
const BACK_TEXTURE_SRC = "/texture/Back-Overlay.png";

const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };
const BACK_VIEWBOX = { w: 622.13, h: 881.02 };

const BASE_CONTAINER_WIDTH = 420;
const SIZE_SCALE: Record<"14" | "16", number> = {
  "14": 14 / 16,
  "16": 1,
};

function useWindowWidth() {
  const [w, setW] = useState(375);
  useEffect(() => {
    setW(window.innerWidth);
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

// Every paintable logical group — kept in sync with GROUP_PREFIXES in
// FrontSVG / BackSVG. Painting the whole bag at once (the pre-selection
// preview) writes all of these.
const ALL_GROUPS = [
  "FRONT_BACK_SIDE",
  "FRONT_MAIN_BOTTOM",
  "FRONT_MAIN_TOP",
  "BACK_MAIN",
  "BACK_STRAP",
  "BAND",
  "BOTTOM",
  "SIDE_PANEL",
  "SIDE",
] as const;

// One cycle of 1.5s — kept in sync with the .paint-flash animation in globals.css.
const FLASH_DURATION_MS = 1500;

export default function CustomizePage() {
  const tCustomize = useTranslations("customize");
  const tColors = useTranslations("colors");
  const tBagGuide = useTranslations("bagGuide");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isMobile = useWindowWidth() < 540;
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [size, setSize] = useState<"14" | "16">("14");
  const [flashGroup, setFlashGroup] = useState<string | null>(null);
  const [flashNonce, setFlashNonce] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const [embroideryLines, setEmbroideryLines] = useState<[string, string]>([
    "",
    "",
  ]);
  const [embroideryLineCount, setEmbroideryLineCount] = useState<1 | 2>(1);
  const [embroideryColor, setEmbroideryColor] =
    useState<EmbroideryColor>("#000000");
  const [embroideryPosition, setEmbroideryPosition] =
    useState<EmbroideryPosition>("top");
  const [embroideryFont, setEmbroideryFont] =
    useState<EmbroideryFont>("sans-serif");
  const [embroideryLineSizes, setEmbroideryLineSizes] = useState<
    [EmbroideryLineSize, EmbroideryLineSize]
  >(["medium", "medium"]);

  const [zipperUpgrade, setZipperUpgrade] = useState<boolean>(false);
  const [zipperColor, setZipperColor] = useState<string>(
    ZIPPER_COLORS[0].value
  );

  const [frontCalibration, setFrontCalibration] =
    useState<Calibration>(FRONT_CALIBRATION);
  const [backCalibration, setBackCalibration] =
    useState<Calibration>(BACK_CALIBRATION);
  const [backSvgTransform, setBackSvgTransform] =
    useState<Calibration>(BACK_SVG_TRANSFORM);
  const [calibrationTarget, setCalibrationTarget] = useState<
    "front" | "back" | "zipper" | null
  >(null);
  const [debugOverlay, setDebugOverlay] = useState(false);

  const [zipperCalibration, setZipperCalibration] =
    useState<ZipperCalibration>(ZIPPER_CALIBRATION);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("calibrate");
    if (target === "front" || target === "back" || target === "zipper") {
      setCalibrationTarget(target);
    }

    // Show confirmation toast when returning from magic-link save flow.
    if (params.get("saved") === "1") {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 4000);
      window.history.replaceState({}, "", "/customize");
    }

    // Restore design state if returning from the invoice page.
    const incoming = decodeDesign(params.get("d"));
    if (incoming) {
      setSize(incoming.size);
      setColors(incoming.colors);
      setEmbroideryLines(incoming.embroideryLines);
      setEmbroideryLineCount(incoming.embroideryLineCount);
      setEmbroideryColor(incoming.embroideryColor);
      setEmbroideryPosition(incoming.embroideryPosition);
      setEmbroideryFont(incoming.embroideryFont);
      setEmbroideryLineSizes(incoming.embroideryLineSizes);
      setZipperUpgrade(incoming.zipperUpgrade);
      setZipperColor(incoming.zipperColor);
    }
  }, []);

  const handleColorClick = (color: string) => {
    // Pre-selection: paint the entire bag as an instant-preview so the user
    // can scan the palette against the whole silhouette. Don't seed
    // selectedPart — once they pick a panel, subsequent clicks should target
    // only that panel (the original behavior).
    if (!selectedPart) {
      setColors((prev) => {
        const next = { ...prev };
        for (const g of ALL_GROUPS) next[g] = color;
        return next;
      });
      return;
    }
    setColors((prev) => ({ ...prev, [selectedPart]: color }));
    setFlashGroup(selectedPart);
    setFlashNonce((n) => n + 1);
  };

  useEffect(() => {
    if (!flashGroup) return;
    const t = setTimeout(() => setFlashGroup(null), FLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [flashGroup, flashNonce]);

  const invoiceHref = `/invoice?d=${encodeURIComponent(
    encodeDesign({
      size,
      colors,
      embroideryLines,
      embroideryLineCount,
      embroideryColor,
      embroideryPosition,
      embroideryFont,
      embroideryLineSizes,
      zipperUpgrade,
      zipperColor,
    }),
  )}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundImage: isDark ? "linear-gradient(#555555, #222222)" : "linear-gradient(#ffffff, #FDFAF3)",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "0 16px 48px" : "0 24px 48px",
        gap: 28,
        color: isDark ? "#fff" : "#222222",
        transition: "background-image 0.5s ease, color 0.5s ease",
      }}
    >
      <SiteHeader />

      {/* INTRO */}
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          textAlign: "center",
          marginTop: -8,
        }}
      >
        <h1
          style={{
            color: "#fff",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 0.5,
            lineHeight: 1.15,
            margin: 0,
            ...(isDark
              ? {
                  background: "linear-gradient(180deg, #ffffff 0%, #c9c9c9 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }
              : { color: "#222222", WebkitTextFillColor: "#222222" }),
          }}
        >
          {tCustomize("intro.title")}
        </h1>
        <p
          style={{
            color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)",
            fontSize: 15,
            fontWeight: 400,
            letterSpacing: 0.3,
            margin: "10px 0 0",
            transition: "color 0.5s ease",
          }}
        >
          {tCustomize("intro.subtitle")}
        </p>
      </div>

      {/* SIZE */}
      <div style={{ display: "flex", gap: 10 }}>
        {(["14", "16"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            style={{
              padding: "6px 18px",
              borderRadius: 999,
              background: size === s ? (isDark ? "#fff" : "#222222") : "transparent",
              color: size === s ? (isDark ? "#222222" : "#fff") : (isDark ? "#fff" : "#222222"),
              fontWeight: 600,
              border: isDark ? "1px solid #fff" : "1px solid #111",
              cursor: "pointer",
              transition: "background 0.3s ease, color 0.3s ease",
            }}
          >
            {s === "14"
              ? tCustomize("size.fourteenInch")
              : tCustomize("size.sixteenInch")}
          </button>
        ))}
      </div>

      {/* BAG */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: BASE_CONTAINER_WIDTH,
            aspectRatio: `${FRONT_VIEWBOX.w} / ${FRONT_VIEWBOX.h}`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${SIZE_SCALE[size]})`,
              transformOrigin: "center center",
            }}
          >
            <FrontSVG
              colors={colors}
              setSelectedPart={setSelectedPart}
              embroideryLines={embroideryLines}
              embroideryLineCount={embroideryLineCount}
              embroideryColor={embroideryColor}
              embroideryPosition={embroideryPosition}
              embroideryFont={embroideryFont}
              embroideryLineSizes={embroideryLineSizes}
              zipperUpgrade={zipperUpgrade}
              zipperColor={zipperColor}
              zipperCalibration={zipperCalibration}
              flashGroup={flashGroup}
              flashNonce={flashNonce}
            />
            <PngOverlayLayer
              viewBoxW={FRONT_VIEWBOX.w}
              viewBoxH={FRONT_VIEWBOX.h}
              pngSrc={FRONT_TEXTURE_SRC}
              calibration={frontCalibration}
              debug={calibrationTarget === "front" && debugOverlay}
            />
            <BagDimensionGuides size={size} />
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: BASE_CONTAINER_WIDTH,
            aspectRatio: `${BACK_VIEWBOX.w} / 606`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${SIZE_SCALE[size]})`,
              transformOrigin: "center center",
            }}
          >
            <BackSVG
              colors={colors}
              setSelectedPart={setSelectedPart}
              svgTransform={backSvgTransform}
              flashGroup={flashGroup}
              flashNonce={flashNonce}
            />
            <PngOverlayLayer
              viewBoxW={BACK_VIEWBOX.w}
              viewBoxH={BACK_VIEWBOX.h}
              pngSrc={BACK_TEXTURE_SRC}
              calibration={backCalibration}
              debug={calibrationTarget === "back" && debugOverlay}
              preserveAspectRatio="xMidYMin slice"
            />
          </div>
        </div>
      </div>

      {/* BAG GUIDE */}
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: 0.4,
            margin: 0,
            animation: "pulse-hint 2.4s ease-in-out 0.8s 3",
            transition: "color 0.5s ease",
          }}
        >
          {tBagGuide("hint")}
        </p>
      </div>

      {/* PRICE DASHBOARD */}
      <PriceDashboard
        size={size}
        zipperUpgrade={zipperUpgrade}
        embroideryLines={embroideryLines}
        embroideryLineCount={embroideryLineCount}
        embroideryLineSizes={embroideryLineSizes}
      />

      {/* COLOR */}
      <div style={{ width: "100%", maxWidth: 720, marginTop: 0 }}>
        <h2
          style={{
            color: isDark ? "#fff" : "#222222",
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            margin: "8px 0 20px",
            transition: "color 0.5s ease",
          }}
        >
          {tCustomize("sections.color")}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {COLOR_GROUPS.map((group) => (
            <div
              key={group.titleKey}
              style={{
                background: isDark
                  ? "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)"
                  : "rgba(255,255,255,0.65)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.85)",
                borderRadius: 20,
                padding: "16px 20px 20px",
                boxShadow: isDark
                  ? "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)"
                  : "0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
                transition: "background 0.5s ease, border-color 0.5s ease",
              }}
            >
              <div
                style={{
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  textAlign: "center",
                  marginBottom: 12,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  transition: "color 0.5s ease",
                }}
              >
                {tColors(`groups.${group.titleKey}`)}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(6, 1fr)",
                  gap: isMobile ? 8 : 10,
                }}
              >
                {group.colors.map((color) => (
                  <div
                    key={color.value}
                    onClick={() => handleColorClick(color.value)}
                    style={{
                      textAlign: "center",
                      cursor: "pointer",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: isMobile ? 38 : 36,
                        height: isMobile ? 38 : 36,
                        borderRadius: "50%",
                        background: color.value,
                        margin: "0 auto",
                        border: "1.5px solid rgba(0,0,0,0.08)",
                      }}
                    />
                    <div
                      style={{
                        fontSize: isMobile ? 9 : 11,
                        lineHeight: 1.25,
                        color: isDark ? "#e4e4e4" : "rgba(0,0,0,0.55)",
                        marginTop: 6,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        transition: "color 0.5s ease",
                      }}
                    >
                      {tColors(`swatches.${color.key}`)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <EmbroideryControls
        lines={embroideryLines}
        lineCount={embroideryLineCount}
        color={embroideryColor}
        position={embroideryPosition}
        font={embroideryFont}
        lineSizes={embroideryLineSizes}
        onLinesChange={setEmbroideryLines}
        onLineCountChange={setEmbroideryLineCount}
        onColorChange={setEmbroideryColor}
        onPositionChange={setEmbroideryPosition}
        onFontChange={setEmbroideryFont}
        onLineSizesChange={setEmbroideryLineSizes}
      />

      <ZipperPullControls
        enabled={zipperUpgrade}
        color={zipperColor}
        onEnabledChange={setZipperUpgrade}
        onColorChange={setZipperColor}
      />

      <SizeVisualizer
        sizeClass={size}
        bagSlot={
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              transform: `scale(${SIZE_SCALE[size]})`,
              transformOrigin: "center center",
            }}
          >
            <FrontSVG
              colors={colors}
              setSelectedPart={() => {}}
              embroideryLines={embroideryLines}
              embroideryLineCount={embroideryLineCount}
              embroideryColor={embroideryColor}
              embroideryPosition={embroideryPosition}
              embroideryFont={embroideryFont}
              embroideryLineSizes={embroideryLineSizes}
              zipperUpgrade={zipperUpgrade}
              zipperColor={zipperColor}
              zipperCalibration={zipperCalibration}
            />
            <PngOverlayLayer
              viewBoxW={FRONT_VIEWBOX.w}
              viewBoxH={FRONT_VIEWBOX.h}
              pngSrc={FRONT_TEXTURE_SRC}
              calibration={frontCalibration}
            />
          </div>
        }
      />

      {/* REVIEW / QUOTE */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 12,
          width: "fit-content",
        }}
      >
        <Link
          href={invoiceHref}
          style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 999,
            background: isDark ? "#fff" : "#222222",
            color: isDark ? "#222222" : "#fff",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 0.5,
            textDecoration: "none",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.5s ease, color 0.5s ease",
          }}
        >
          {tCustomize("actions.reviewDesign")}
        </Link>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            width: "100%",
            padding: "15px 0",
            borderRadius: 999,
            background: "transparent",
            color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.45)",
            fontWeight: 600,
            fontSize: 16,
            letterSpacing: 0.5,
            border: isDark ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(0,0,0,0.2)",
            cursor: "pointer",
            transition: "color 0.5s ease, border-color 0.5s ease",
          }}
        >
          Save my style
        </button>
      </div>

      {(calibrationTarget === "front" || calibrationTarget === "back") && (
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
          svgCalibration={
            calibrationTarget === "back" ? backSvgTransform : undefined
          }
          onSvgChange={
            calibrationTarget === "back" ? setBackSvgTransform : undefined
          }
          debug={debugOverlay}
          onDebugChange={setDebugOverlay}
        />
      )}

      {calibrationTarget === "zipper" && (
        <ZipperCalibrationPanel
          calibration={zipperCalibration}
          onChange={setZipperCalibration}
        />
      )}

      <SiteFooter />

      {showSaveModal && (
        <SaveDesignModal
          design={{
            size, colors, embroideryLines, embroideryLineCount,
            embroideryColor, embroideryPosition, embroideryFont,
            embroideryLineSizes, zipperUpgrade, zipperColor,
          }}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {savedToast && (
        <div
          style={{
            position: "fixed", bottom: 28, left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,30,30,0.96)",
            border: "1px solid rgba(168,230,163,0.4)",
            borderRadius: 999,
            padding: "12px 24px",
            color: "#a8e6a3",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 400,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          ✓ Your design has been saved for this season
        </div>
      )}
    </main>
  );
}
