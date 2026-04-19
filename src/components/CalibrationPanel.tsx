"use client";

import { useState } from "react";
import type { Calibration } from "@/lib/overlayCalibration";

type Props = {
  target: "front" | "back";
  calibration: Calibration;
  onChange: (next: Calibration) => void;
  svgCalibration?: Calibration;
  onSvgChange?: (next: Calibration) => void;
  debug: boolean;
  onDebugChange: (next: boolean) => void;
};

type Field = keyof Calibration;

const RANGES: Record<Field, { min: number; max: number; step: number }> = {
  translateX: { min: -1000, max: 1000, step: 1 },
  translateY: { min: -1000, max: 1000, step: 1 },
  scaleX: { min: 0.5, max: 2, step: 0.01 },
  scaleY: { min: 0.5, max: 2, step: 0.01 },
  rotation: { min: -45, max: 45, step: 0.1 },
};

const FIELDS: Field[] = [
  "translateX",
  "translateY",
  "scaleX",
  "scaleY",
  "rotation",
];

export default function CalibrationPanel({
  target,
  calibration,
  onChange,
  svgCalibration,
  onSvgChange,
  debug,
  onDebugChange,
}: Props) {
  const hasSvgLayer = !!svgCalibration && !!onSvgChange;
  const [layer, setLayer] = useState<"png" | "svg">("png");
  const activeLayer = hasSvgLayer ? layer : "png";

  const activeCalibration =
    activeLayer === "svg" && svgCalibration ? svgCalibration : calibration;
  const activeOnChange =
    activeLayer === "svg" && onSvgChange ? onSvgChange : onChange;

  const update = (field: Field, value: number) => {
    activeOnChange({ ...activeCalibration, [field]: value });
  };

  const copyJson = async () => {
    const json = JSON.stringify(activeCalibration, null, 2);
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      console.log("[CalibrationPanel] Clipboard blocked, JSON below:\n" + json);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        width: 300,
        padding: 16,
        background: "rgba(20,24,26,0.95)",
        color: "#fff",
        borderRadius: 8,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        zIndex: 10000,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 10 }}>
        Calibrating: {target.toUpperCase()}
      </div>

      {hasSvgLayer && (
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
            background: "#222",
            borderRadius: 4,
            padding: 3,
          }}
        >
          {(["png", "svg"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              style={{
                flex: 1,
                padding: "6px 8px",
                background: activeLayer === l ? "#3757AA" : "transparent",
                color: "#fff",
                border: "none",
                borderRadius: 3,
                cursor: "pointer",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {FIELDS.map((field) => {
        const { min, max, step } = RANGES[field];
        return (
          <div key={field} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <label>{field}</label>
              <input
                type="number"
                value={activeCalibration[field]}
                step={step}
                onChange={(e) => update(field, Number(e.target.value))}
                style={{
                  width: 80,
                  background: "#222",
                  color: "#fff",
                  border: "1px solid #444",
                  borderRadius: 3,
                  padding: "2px 4px",
                }}
              />
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={activeCalibration[field]}
              onChange={(e) => update(field, Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        );
      })}

      <label
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginTop: 10,
        }}
      >
        <input
          type="checkbox"
          checked={debug}
          onChange={(e) => onDebugChange(e.target.checked)}
        />
        Debug overlay (50% opacity)
      </label>

      <button
        onClick={copyJson}
        style={{
          marginTop: 12,
          padding: "8px 12px",
          width: "100%",
          background: "#3757AA",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Copy {activeLayer.toUpperCase()} JSON
      </button>
    </div>
  );
}
