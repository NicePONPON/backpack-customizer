"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  // Drives which calibration set is used. `null` hides the bag overlays
  // (used on the home page when no gallery card is snapped yet).
  sizeClass: "14" | "16" | null;
  // Rendered inside each figure's bag slot (man + woman). The same node is
  // mounted twice — gallery: an <img>; customize: the live FrontSVG + PNG
  // overlay composition.
  bagSlot?: ReactNode;
};

// Source image: /public/texture/peopleback.png — man (175cm) left, woman (160cm) right.
const IMG_W = 1402;
const IMG_H = 1122;

// The man silhouette occupies ~85% of the source image height.
const MAN_HEIGHT_CM = 175;
const MAN_PIXEL_FRACTION = 0.85;
const PX_PER_CM_IN_SOURCE = (IMG_H * MAN_PIXEL_FRACTION) / MAN_HEIGHT_CM;

// Every gallery photo depicts a 41 cm tall bag, regardless of 14" / 16" class.
const BAG_HEIGHT_CM = 41;
const BAG_BOX_HEIGHT_PCT =
  ((BAG_HEIGHT_CM * PX_PER_CM_IN_SOURCE) / IMG_H) * 100;

type FigureCalibration = {
  centerX: number; // % of image width
  bagTopY: number; // % of image height (top of bag overlay)
  scale: number; // multiplier on BAG_BOX_HEIGHT_PCT
};

type SizeCalibration = {
  man: FigureCalibration;
  woman: FigureCalibration;
};

const DEFAULT_CALIBRATION: Record<"14" | "16", SizeCalibration> = {
  "14": {
    man: { centerX: 37, bagTopY: 16, scale: 1.36 },
    woman: { centerX: 65, bagTopY: 24, scale: 1.36 },
  },
  "16": {
    man: { centerX: 36.5, bagTopY: 17, scale: 1.36 },
    woman: { centerX: 65.5, bagTopY: 24, scale: 1.36 },
  },
};

const FIGURE_KEYS = ["man", "woman"] as const;
type FigureKey = (typeof FIGURE_KEYS)[number];

const SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

export default function SizeVisualizer({ sizeClass, bagSlot }: Props) {
  const [tuneMode, setTuneMode] = useState(false);
  const [calibration, setCalibration] = useState<
    Record<"14" | "16", SizeCalibration>
  >(DEFAULT_CALIBRATION);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URL(window.location.href).searchParams;
    setTuneMode(params.get("tune") === "visualizer");
  }, []);

  const activeSize: "14" | "16" = sizeClass ?? "16";
  const showBag = sizeClass !== null && bagSlot != null;

  return (
    <div
      style={{
        marginTop: 36,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        How it wears
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 620,
        }}
      >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${IMG_W} / ${IMG_H}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/texture/peopleback.png"
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            userSelect: "none",
            opacity: 0.9,
            mixBlendMode: "multiply",
          }}
        />

        {FIGURE_KEYS.map((figKey) => {
          const c = calibration[activeSize][figKey];
          return (
            <div
              key={figKey}
              style={{
                position: "absolute",
                left: `${c.centerX}%`,
                top: `${c.bagTopY}%`,
                height: `${BAG_BOX_HEIGHT_PCT * c.scale}%`,
                aspectRatio: "1 / 1",
                transform: "translateX(-50%)",
                opacity: showBag ? 1 : 0,
                transition: tuneMode
                  ? "none"
                  : `opacity 0.5s ${SMOOTH_EASE}`,
                pointerEvents: "none",
                filter:
                  "drop-shadow(0 6px 14px rgba(0,0,0,0.45)) saturate(0.85)",
              }}
            >
              {showBag && bagSlot}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          height: 36,
          marginTop: 4,
        }}
      >
        {[
          { x: 36.75, cm: 175, ftIn: `5'9"` },
          { x: 65.25, cm: 160, ftIn: `5'3"` },
        ].map((h) => (
          <div
            key={h.cm}
            style={{
              position: "absolute",
              left: `${h.x}%`,
              top: 0,
              transform: "translateX(-50%)",
              textAlign: "center",
              color: "rgba(255,255,255,0.78)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.6,
              whiteSpace: "nowrap",
            }}
          >
            <div>{h.cm} cm</div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "rgba(255,255,255,0.5)",
                marginTop: 1,
              }}
            >
              {h.ftIn}
            </div>
          </div>
        ))}
      </div>
      </div>

      {tuneMode && (
        <TunePanel
          activeSize={activeSize}
          calibration={calibration}
          onChange={setCalibration}
        />
      )}
    </div>
  );
}

function TunePanel({
  activeSize,
  calibration,
  onChange,
}: {
  activeSize: "14" | "16";
  calibration: Record<"14" | "16", SizeCalibration>;
  onChange: (next: Record<"14" | "16", SizeCalibration>) => void;
}) {
  const update = (
    figKey: FigureKey,
    field: keyof FigureCalibration,
    value: number,
  ) => {
    onChange({
      ...calibration,
      [activeSize]: {
        ...calibration[activeSize],
        [figKey]: {
          ...calibration[activeSize][figKey],
          [field]: value,
        },
      },
    });
  };

  const copyJson = () => {
    const json = JSON.stringify(calibration, null, 2);
    navigator.clipboard?.writeText(json).catch(() => {});
    console.log(json);
  };

  const reset = () => onChange(DEFAULT_CALIBRATION);

  return (
    <div
      style={{
        marginTop: 16,
        padding: "16px 18px",
        width: "100%",
        maxWidth: 620,
        background:
          "linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 14,
        color: "#fff",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontSize: 11,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          Tune visualizer · adjusting{" "}
          <span style={{ color: "#F0E196" }}>{activeSize}&quot;</span>
          <span
            style={{
              marginLeft: 8,
              fontSize: 10,
              color: "rgba(255,255,255,0.5)",
              letterSpacing: 1.2,
            }}
          >
            (scroll gallery to switch size)
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={reset}
            style={btnStyle("rgba(255,255,255,0.12)")}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={copyJson}
            style={btnStyle("rgba(240,225,150,0.85)", "#1a1a1a")}
          >
            Copy JSON
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {FIGURE_KEYS.map((figKey) => {
          const c = calibration[activeSize][figKey];
          return (
            <div
              key={figKey}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "10px 12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {figKey === "man" ? "Man · 175 cm" : "Woman · 160 cm"}
              </div>
              <Slider
                label="centerX (%)"
                value={c.centerX}
                min={0}
                max={100}
                step={0.5}
                onChange={(v) => update(figKey, "centerX", v)}
              />
              <Slider
                label="bagTopY (%)"
                value={c.bagTopY}
                min={0}
                max={60}
                step={0.5}
                onChange={(v) => update(figKey, "bagTopY", v)}
              />
              <Slider
                label="scale"
                value={c.scale}
                min={0.3}
                max={2}
                step={0.01}
                onChange={(v) => update(figKey, "scale", v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 11,
        color: "rgba(255,255,255,0.75)",
      }}
    >
      <span
        style={{ display: "flex", justifyContent: "space-between", gap: 8 }}
      >
        <span>{label}</span>
        <span style={{ color: "#fff", fontWeight: 600 }}>
          {value.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%" }}
      />
    </label>
  );
}

function btnStyle(bg: string, color = "#fff"): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.2)",
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
