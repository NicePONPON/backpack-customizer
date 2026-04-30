"use client";

import { useTranslations } from "next-intl";

export type EmbroideryPosition = "top" | "bottom";
export type EmbroideryColor =
  | "#000000"
  | "#FFFFFF"
  | "#808080"
  | "#D32F2F"
  | "#1976D2"
  | "#FBC02D";
export type EmbroideryFont = "serif" | "sans-serif";
export type EmbroideryLineSize = "small" | "medium" | "large";

export const EMBROIDERY_COLORS: Array<{
  value: EmbroideryColor;
  name: string;
  nameKey: string;
}> = [
  { value: "#000000", name: "Black", nameKey: "colorBlack" },
  { value: "#FFFFFF", name: "White", nameKey: "colorWhite" },
  { value: "#808080", name: "Gray", nameKey: "colorGray" },
  { value: "#D32F2F", name: "Red", nameKey: "colorRed" },
  { value: "#1976D2", name: "Blue", nameKey: "colorBlue" },
  { value: "#FBC02D", name: "Yellow", nameKey: "colorYellow" },
];

const SIZE_KEYS: EmbroideryLineSize[] = ["small", "medium", "large"];
const SIZE_TKEY: Record<EmbroideryLineSize, string> = {
  small: "sizeSmall",
  medium: "sizeMedium",
  large: "sizeLarge",
};

type Props = {
  lines: [string, string];
  lineCount: 1 | 2;
  color: EmbroideryColor;
  position: EmbroideryPosition;
  font: EmbroideryFont;
  lineSizes: [EmbroideryLineSize, EmbroideryLineSize];
  onLinesChange: (next: [string, string]) => void;
  onLineCountChange: (next: 1 | 2) => void;
  onColorChange: (next: EmbroideryColor) => void;
  onPositionChange: (next: EmbroideryPosition) => void;
  onFontChange: (next: EmbroideryFont) => void;
  onLineSizesChange: (next: [EmbroideryLineSize, EmbroideryLineSize]) => void;
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 18px",
  borderRadius: 999,
  background: active ? "#fff" : "transparent",
  color: active ? "#111" : "#fff",
  fontWeight: 600,
  border: "1px solid #fff",
  cursor: "pointer",
});

const miniPillStyle = (active: boolean): React.CSSProperties => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  background: active ? "#fff" : "transparent",
  color: active ? "#111" : "#fff",
  fontWeight: 700,
  border: "1px solid #888",
  cursor: "pointer",
  fontSize: 12,
});

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #888",
  background: "#1b1b1b",
  color: "#fff",
  fontSize: 14,
};

const sectionHeaderStyle: React.CSSProperties = {
  color: "#fff",
  textAlign: "center",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: 2,
  margin: "8px 0 20px",
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 20,
  padding: "16px 20px 20px",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
};

const cardTitleStyle: React.CSSProperties = {
  color: "#fff",
  textAlign: "center",
  marginBottom: 12,
  fontWeight: 600,
  letterSpacing: 0.5,
};

export default function EmbroideryControls({
  lines,
  lineCount,
  color,
  position,
  font,
  lineSizes,
  onLinesChange,
  onLineCountChange,
  onColorChange,
  onPositionChange,
  onFontChange,
  onLineSizesChange,
}: Props) {
  const t = useTranslations("embroidery");

  const setLine = (index: 0 | 1, value: string) => {
    const next: [string, string] = [lines[0], lines[1]];
    next[index] = value;
    onLinesChange(next);
  };

  const setLineSize = (index: 0 | 1, value: EmbroideryLineSize) => {
    const next: [EmbroideryLineSize, EmbroideryLineSize] = [
      lineSizes[0],
      lineSizes[1],
    ];
    next[index] = value;
    onLineSizesChange(next);
  };

  const renderLineRow = (index: 0 | 1) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        style={inputStyle}
        value={lines[index]}
        onChange={(e) => setLine(index, e.target.value)}
        placeholder={t("linePlaceholder", { n: index + 1 })}
      />
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {SIZE_KEYS.map((s) => {
          const label = t(SIZE_TKEY[s]);
          return (
            <button
              key={s}
              onClick={() => setLineSize(index, s)}
              style={miniPillStyle(lineSizes[index] === s)}
              title={label}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: 720, color: "#fff" }}>
      <h2 style={sectionHeaderStyle}>{t("sectionHeader")}</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>{t("lines")}</div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => onLineCountChange(n)}
                style={pillStyle(lineCount === n)}
              >
                {n === 1 ? t("lineCount1") : t("lineCount2")}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {renderLineRow(0)}
            {lineCount === 2 && renderLineRow(1)}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>{t("fontStyle")}</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
            }}
          >
            {(["serif", "sans-serif"] as const).map((f) => (
              <button
                key={f}
                onClick={() => onFontChange(f)}
                style={{
                  ...pillStyle(font === f),
                  fontFamily:
                    f === "serif"
                      ? "Georgia, Times, serif"
                      : "Arial, Helvetica, sans-serif",
                }}
              >
                {f === "serif" ? t("fontSerif") : t("fontSans")}
              </button>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>{t("position")}</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <button
              onClick={() => onPositionChange("top")}
              style={pillStyle(position === "top")}
            >
              {t("positionTop")}
            </button>
            <button
              onClick={() => onPositionChange("bottom")}
              style={pillStyle(position === "bottom")}
            >
              {t("positionBottom")}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitleStyle}>{t("threadColor")}</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            {EMBROIDERY_COLORS.map((c) => (
              <div
                key={c.value}
                onClick={() => onColorChange(c.value)}
                style={{ textAlign: "center", cursor: "pointer" }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: c.value,
                    margin: "0 auto",
                    border:
                      color === c.value ? "3px solid #4aa3ff" : "1px solid #444",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 12, color: "#e4e4e4", marginTop: 6 }}>
                  {t(c.nameKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
