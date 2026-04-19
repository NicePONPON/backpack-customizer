"use client";

import type { Calibration } from "@/lib/overlayCalibration";

type Props = {
  target: "front" | "back";
  calibration: Calibration;
  onChange: (next: Calibration) => void;
  debug: boolean;
  onDebugChange: (next: boolean) => void;
};

type Field = keyof Calibration;

const RANGES: Record<Field, { min: number; max: number; step: number }> = {
  translateX: { min: -500, max: 500, step: 1 },
  translateY: { min: -500, max: 500, step: 1 },
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
  debug,
  onDebugChange,
}: Props) {
  const update = (field: Field, value: number) => {
    onChange({ ...calibration, [field]: value });
  };

  const copyJson = async () => {
    const json = JSON.stringify(calibration, null, 2);
    await navigator.clipboard.writeText(json);
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
                value={calibration[field]}
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
              value={calibration[field]}
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
        Copy JSON
      </button>
    </div>
  );
}
