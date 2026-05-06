"use client";

import { useEffect, useState } from "react";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SaveDesignModal from "@/components/SaveDesignModal";
import CommunityGallery from "@/components/CommunityGallery";
import ZipperPullControls, { ZIPPER_COLORS } from "@/components/ZipperPullControls";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  BACK_SVG_TRANSFORM,
  ZIPPER_CALIBRATION,
} from "@/lib/overlayCalibration";
import { COLOR_GROUPS } from "@/lib/bagReference";
import { decodeDesign, encodeDesign } from "@/lib/invoiceSerialization";
import type { EmbroideryColor, EmbroideryFont, EmbroideryPosition, EmbroideryLineSize } from "@/components/EmbroideryControls";

const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };
const BACK_VIEWBOX = { w: 622.13, h: 881.02 };
const BASE_W = 380;
const SIZE_SCALE: Record<"14" | "16", number> = { "14": 14 / 16, "16": 1 };

const ALL_GROUPS = [
  "FRONT_BACK_SIDE", "FRONT_MAIN_BOTTOM", "FRONT_MAIN_TOP",
  "BACK_MAIN", "BACK_STRAP", "BAND", "BOTTOM", "SIDE_PANEL", "SIDE",
] as const;

export default function StudioPage() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [size, setSize] = useState<"14" | "16">("14");
  const [zipperUpgrade, setZipperUpgrade] = useState(false);
  const [zipperColor, setZipperColor] = useState<string>(ZIPPER_COLORS[0].value);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Embroidery state kept minimal for studio (no UI controls exposed)
  const embroideryLines: [string, string] = ["", ""];
  const embroideryLineCount: 1 | 2 = 1;
  const embroideryColor: EmbroideryColor = "#000000";
  const embroideryPosition: EmbroideryPosition = "top";
  const embroideryFont: EmbroideryFont = "sans-serif";
  const embroideryLineSizes: [EmbroideryLineSize, EmbroideryLineSize] = ["medium", "medium"];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("saved") === "1") {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 4000);
      window.history.replaceState({}, "", "/studio");
    }

    const incoming = decodeDesign(params.get("d"));
    if (incoming) {
      setSize(incoming.size);
      setColors(incoming.colors);
      setZipperUpgrade(incoming.zipperUpgrade);
      setZipperColor(incoming.zipperColor);
    }
  }, []);

  const handleColorClick = (color: string) => {
    if (!selectedPart) {
      setColors(() => {
        const next: Record<string, string> = {};
        for (const g of ALL_GROUPS) next[g] = color;
        return next;
      });
      return;
    }
    setColors((prev) => ({ ...prev, [selectedPart]: color }));
  };

  const design = {
    size, colors,
    embroideryLines, embroideryLineCount, embroideryColor, embroideryPosition, embroideryFont, embroideryLineSizes,
    zipperUpgrade, zipperColor,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(#555555, #222222)",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 24px 64px",
        gap: 40,
      }}
    >
      <SiteHeader />

      {/* HERO */}
      <div style={{ width: "100%", maxWidth: 680, textAlign: "center", marginTop: -8 }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.38)" }}>
          Community Studio
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px, 6vw, 42px)",
            fontWeight: 700,
            letterSpacing: 0.5,
            lineHeight: 1.15,
            background: "linear-gradient(180deg, #ffffff 0%, #c9c9c9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Make What You Want
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 500, marginInline: "auto" }}>
          Pick your colors. Submit your vote. The most popular style gets made next season.
        </p>
      </div>

      {/* PRIZE BANNER */}
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          background: "linear-gradient(135deg, rgba(255,215,100,0.12) 0%, rgba(255,180,50,0.06) 100%)",
          border: "1px solid rgba(255,215,100,0.35)",
          borderRadius: 20,
          padding: "22px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28 }}>🎁</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "rgba(255,215,100,0.95)", letterSpacing: 0.5 }}>
          Win a free custom backpack
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 460 }}>
          The designer of this season's #1 voted style receives a complimentary handmade backpack in their winning colorway — on us.
        </p>
      </div>

      {/* THIS SEASON'S TOP STYLES */}
      <div style={{ width: "100%", maxWidth: 960 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
            Current standings
          </p>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1, color: "#fff" }}>
            THIS SEASON'S TOP STYLES
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Click "Vote for this style" to cast your vote, or scroll down to design your own.
          </p>
        </div>
        <CommunityGallery topStylesOnly />
      </div>

      {/* DIVIDER */}
      <div style={{ width: "100%", maxWidth: 680, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Or design your own
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
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
              background: size === s ? "#fff" : "transparent",
              color: size === s ? "#111" : "#fff",
              fontWeight: 600,
              border: "1px solid #fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {s}" laptop
          </button>
        ))}
      </div>

      {/* BAG */}
      <div
        style={{
          display: "flex",
          gap: 12,
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
            maxWidth: BASE_W,
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
              zipperCalibration={ZIPPER_CALIBRATION}
            />
            <PngOverlayLayer
              viewBoxW={FRONT_VIEWBOX.w}
              viewBoxH={FRONT_VIEWBOX.h}
              pngSrc="/texture/Front-Overlay.png"
              calibration={FRONT_CALIBRATION}
            />
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: BASE_W,
            aspectRatio: `${BACK_VIEWBOX.w} / ${BACK_VIEWBOX.h}`,
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
              svgTransform={BACK_SVG_TRANSFORM}
            />
            <PngOverlayLayer
              viewBoxW={BACK_VIEWBOX.w}
              viewBoxH={BACK_VIEWBOX.h}
              pngSrc="/texture/Back-Overlay.png"
              calibration={BACK_CALIBRATION}
            />
          </div>
        </div>
      </div>

      <p style={{ margin: "-28px 0 0", fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 0.3, textAlign: "center" }}>
        Tap a panel to select it, then pick a color below
      </p>

      {/* COLOR PALETTE */}
      <div style={{ width: "100%", maxWidth: 680 }}>
        <h2 style={{ color: "#fff", textAlign: "center", fontSize: 18, fontWeight: 700, letterSpacing: 2, margin: "0 0 16px" }}>
          COLORS
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {COLOR_GROUPS.map((group) => (
            <div
              key={group.titleKey}
              style={{
                background: "linear-gradient(135deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.15) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: "14px 18px 18px",
              }}
            >
              <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 10, fontWeight: 600, fontSize: 12, letterSpacing: 1 }}>
                {group.titleKey.replace(/_/g, " ")}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
                {group.colors.map((color) => (
                  <div
                    key={color.value}
                    onClick={() => handleColorClick(color.value)}
                    style={{ textAlign: "center", cursor: "pointer", minWidth: 0 }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: color.value,
                        margin: "0 auto",
                        border: "1.5px solid rgba(255,255,255,0.15)",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 10,
                        lineHeight: 1.25,
                        color: "#ccc",
                        marginTop: 5,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {color.key.replace(/_/g, " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ZIPPER */}
      <ZipperPullControls
        enabled={zipperUpgrade}
        color={zipperColor}
        onEnabledChange={setZipperUpgrade}
        onColorChange={setZipperColor}
      />

      {/* SUBMIT CTA */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%", maxWidth: 420 }}>
        <button
          onClick={() => setShowSaveModal(true)}
          style={{
            width: "100%",
            padding: "16px 28px",
            borderRadius: 999,
            background: "#fff",
            color: "#111",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: 0.5,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          Submit my vote →
        </button>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
          One vote per email per season. You can update it anytime before the season closes.
        </p>
      </div>

      {/* PREVIOUS SEASON */}
      <div style={{ width: "100%", maxWidth: 960 }}>
        <CommunityGallery />
      </div>

      <SiteFooter />

      {showSaveModal && (
        <SaveDesignModal
          design={design}
          onClose={() => setShowSaveModal(false)}
          nextPath="/studio"
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
          ✓ Your vote has been saved for this season
        </div>
      )}
    </main>
  );
}
