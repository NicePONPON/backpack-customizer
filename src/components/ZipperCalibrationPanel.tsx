"use client";

import type { ZipperCalibration } from "@/lib/overlayCalibration";

type Props = {
  calibration: ZipperCalibration;
  onChange: (next: ZipperCalibration) => void;
};

type Field = keyof ZipperCalibration;

const RANGES: Record<Field, { min: number; max: number; step: number }> = {
  leftX: { min: -500, max: 500, step: 1 },
  leftY: { min: -500, max: 500, step: 1 },
  leftRotation: { min: -180, max: 180, step: 0.5 },
  rightX: { min: -500, max: 500, step: 1 },
  rightY: { min: -500, max: 500, step: 1 },
  rightRotation: { min: -180, max: 180, step: 0.5 },
};

const FIELDS: Field[] = [
  "leftX",
  "leftY",
  "leftRotation",
  "rightX",
  "rightY",
  "rightRotation",
];

export default function ZipperCalibrationPanel({
  calibration,
  onChange,
}: Props) {
  const update = (field: Field, value: number) => {
    onChange({ ...calibration, [field]: value });
  };

  const copyJson = async () => {
    const json = JSON.stringify(calibration, null, 2);
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      console.log(
        "[ZipperCalibrationPanel] Clipboard blocked, JSON below:\n" + json
      );
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
        Calibrating: ZIPPER
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
        Copy ZIPPER JSON
      </button>
    </div>
  );
}
