"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
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

const FIRST_CLICK_DEFAULT_PART = "FRONT_MAIN_BOTTOM";
const FLASH_DURATION_MS = 6000;

export default function Page() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [size, setSize] = useState<"14" | "16">("14");
  const [flashGroup, setFlashGroup] = useState<string | null>(null);
  const [flashNonce, setFlashNonce] = useState(0);

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
    // First-click nudge: if the user hasn't picked a part yet, aim the color
    // at the front lower panel so the tool visibly responds on their first try.
    const target = selectedPart ?? FIRST_CLICK_DEFAULT_PART;
    if (!selectedPart) setSelectedPart(target);
    setColors((prev) => ({ ...prev, [target]: color }));
    setFlashGroup(target);
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
        background: "linear-gradient(#555555, #222222)",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 24px 48px",
        gap: 28,
      }}
    >
      <img src={LOGO_SRC} style={{ height: 80 }} />

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
            background:
              "linear-gradient(180deg, #ffffff 0%, #c9c9c9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Design your everyday carry
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 15,
            fontWeight: 400,
            letterSpacing: 0.3,
            margin: "10px 0 0",
          }}
        >
          Customize size, color, and attachement in real time
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
              background: size === s ? "#fff" : "transparent",
              color: size === s ? "#111" : "#fff",
              fontWeight: 600,
              border: "1px solid #fff",
              cursor: "pointer",
            }}
          >
            {s} inch
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
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: BASE_CONTAINER_WIDTH,
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
            />
          </div>
        </div>
      </div>

      {/* COLOR */}
      <div style={{ width: "100%", maxWidth: 720, marginTop: -140 }}>
        <h2
          style={{
            color: "#fff",
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 2,
            margin: "8px 0 20px",
          }}
        >
          FABRIC COLOR SELECTION
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {COLOR_GROUPS.map((group) => (
            <div
              key={group.title}
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 20,
                padding: "16px 20px 20px",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              <div
                style={{
                  color: "#fff",
                  textAlign: "center",
                  marginBottom: 12,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                {group.title}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 10,
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
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: color.value,
                        margin: "0 auto",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        lineHeight: 1.25,
                        color: "#e4e4e4",
                        marginTop: 6,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {color.name}
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

      {/* REVIEW / QUOTE */}
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          display: "flex",
          justifyContent: "center",
          marginTop: 12,
        }}
      >
        <Link
          href={invoiceHref}
          style={{
            padding: "14px 34px",
            borderRadius: 999,
            background: "#fff",
            color: "#111",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 0.5,
            textDecoration: "none",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          Review your design →
        </Link>
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

      {/* FOOTER */}
      <footer
        style={{
          width: "100%",
          maxWidth: 720,
          textAlign: "center",
          marginTop: 16,
          color: "rgba(255,255,255,0.45)",
          fontSize: 12,
          lineHeight: 1.6,
          letterSpacing: 0.3,
        }}
      >
        <div>
          © 2026 Computex Systems Investments (PTY) LTD. All rights reserved.
        </div>
        <div>Designed and engineered for modern everyday carry.</div>
      </footer>
    </main>
  );
}
