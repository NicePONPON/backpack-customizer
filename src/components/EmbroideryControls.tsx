"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

export type EmbroideryPosition = "top" | "bottom";
export type EmbroideryColor = string;
export type EmbroideryFont = string;
export type EmbroideryLineSize = "small" | "medium" | "large" | "xl";

const SIZE_KEYS: EmbroideryLineSize[] = ["small", "medium", "large", "xl"];
const SIZE_TKEY: Record<EmbroideryLineSize, string> = {
  small: "sizeSmall",
  medium: "sizeMedium",
  large: "sizeLarge",
  xl: "sizeXL",
};
const SIZE_FONT: Record<EmbroideryLineSize, number> = {
  small: 10,
  medium: 13,
  large: 17,
  xl: 21,
};

type FontDef = {
  key: string;
  label: string;
  family: string;
  lang: "latin" | "chinese";
};

export const FONTS: FontDef[] = [
  { key: "Arial",      label: "Arial",       family: "Arial, Helvetica, sans-serif",                    lang: "latin" },
  { key: "Helvetica",  label: "Helvetica",   family: '"Helvetica Neue", Helvetica, Arial, sans-serif',  lang: "latin" },
  { key: "Montserrat", label: "Montserrat",  family: '"Montserrat", sans-serif',                        lang: "latin" },
  { key: "Noto Sans",  label: "Noto Sans",   family: '"Noto Sans", sans-serif',                         lang: "latin" },
  { key: "Georgia",    label: "Georgia",     family: "Georgia, serif",                                   lang: "latin" },
  { key: "Taipei Sans TC Beta", label: "台北黑體 Beta",  family: '"Taipei Sans TC Beta", sans-serif',   lang: "chinese" },
  { key: "Swei Spring SC",      label: "獅尾四季春SC",   family: '"Swei Spring CJK SC", serif',         lang: "chinese" },
];

export function fontFamilyFor(key: string): string {
  return FONTS.find((f) => f.key === key)?.family ?? key;
}

export type ThreadColorPreset = { name: string; value: string };

export const THREAD_COLOR_PRESETS: ThreadColorPreset[] = [
  { name: "Black",        value: "#1C1C1C" },
  { name: "White",        value: "#F5F5F5" },
  { name: "Charcoal",     value: "#6E6E6E" },
  { name: "Navy",         value: "#1A2E5A" },
  { name: "Royal Blue",   value: "#2B5EC7" },
  { name: "Red",          value: "#CC2222" },
  { name: "Forest Green", value: "#2D6A2D" },
  { name: "Gold",         value: "#D4A017" },
  { name: "Orange",       value: "#E05C1A" },
  { name: "Purple",       value: "#6B2FA0" },
];

export function threadColorName(hex: string): string {
  const normalized = hex.toUpperCase();
  return THREAD_COLOR_PRESETS.find((c) => c.value.toUpperCase() === normalized)?.name ?? hex.toUpperCase();
}

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Noto+Sans:wght@400;700&display=swap";

const CUSTOM_FONT_CSS = `
@font-face {
  font-family: 'Taipei Sans TC Beta';
  src: url('https://cdn.jsdelivr.net/gh/minglai/TaipeiSansTCBeta@main/TaipeiSansTCBeta-Regular.woff2') format('woff2');
  font-weight: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Swei Spring CJK SC';
  src: url('https://cdn.jsdelivr.net/gh/max32002/swei-spring@master/font/SweiSpringCJKsc-Regular.woff2') format('woff2');
  font-weight: normal;
  font-display: swap;
}
`;

function useFonts() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    // Google Fonts
    if (!document.querySelector(`link[href="${GOOGLE_FONTS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_URL;
      document.head.appendChild(link);
    }
    // Custom @font-face
    if (!document.querySelector("#embroidery-custom-fonts")) {
      const style = document.createElement("style");
      style.id = "embroidery-custom-fonts";
      style.textContent = CUSTOM_FONT_CSS;
      document.head.appendChild(style);
    }
  }, []);
}

const SIZE_KEYS_ARR: EmbroideryLineSize[] = ["small", "medium", "large", "xl"];

type Props = {
  lines: [string, string];
  lineCount: 1 | 2;
  color: EmbroideryColor;
  position: EmbroideryPosition;
  font: EmbroideryFont;
  lineSizes: [EmbroideryLineSize, EmbroideryLineSize];
  maxChars?: [number, number];
  onLinesChange: (next: [string, string]) => void;
  onLineCountChange: (next: 1 | 2) => void;
  onColorChange: (next: EmbroideryColor) => void;
  onPositionChange: (next: EmbroideryPosition) => void;
  onFontChange: (next: EmbroideryFont) => void;
  onLineSizesChange: (next: [EmbroideryLineSize, EmbroideryLineSize]) => void;
};

export default function EmbroideryControls({
  lines,
  lineCount,
  color,
  position,
  font,
  lineSizes,
  maxChars,
  onLinesChange,
  onLineCountChange,
  onColorChange,
  onPositionChange,
  onFontChange,
  onLineSizesChange,
}: Props) {
  const t = useTranslations("embroidery");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  useFonts();

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 18px",
    borderRadius: 999,
    background: active ? (isDark ? "#fff" : "#222222") : "transparent",
    color: active ? (isDark ? "#222222" : "#fff") : (isDark ? "#fff" : "#222222"),
    fontWeight: 600,
    border: isDark ? "1px solid #fff" : "1px solid #222222",
    cursor: "pointer",
    transition: "background 0.3s ease, color 0.3s ease",
  });

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "8px 12px",
    borderRadius: 8,
    border: isDark ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(0,0,0,0.18)",
    background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.8)",
    color: isDark ? "#fff" : "#222222",
    fontSize: 14,
  };

  const cardStyle: React.CSSProperties = {
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
  };

  const labelStyle: React.CSSProperties = {
    color: isDark ? "#fff" : "#222222",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: 600,
    letterSpacing: 0.5,
    transition: "color 0.5s ease",
  };

  const setLine = (index: 0 | 1, value: string) => {
    const next: [string, string] = [lines[0], lines[1]];
    next[index] = value;
    onLinesChange(next);
  };

  const setLineSize = (index: 0 | 1, value: EmbroideryLineSize) => {
    const next: [EmbroideryLineSize, EmbroideryLineSize] = [lineSizes[0], lineSizes[1]];
    next[index] = value;
    onLineSizesChange(next);
  };

  const handleHexInput = (raw: string) => {
    const val = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onColorChange(val);
  };

  const renderLineRow = (index: 0 | 1) => {
    const limit = maxChars?.[index];
    return (
      <div key={index} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            style={inputStyle}
            value={lines[index]}
            maxLength={limit}
            onChange={(e) => setLine(index, e.target.value)}
            placeholder={t("linePlaceholder", { n: index + 1 })}
          />
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {SIZE_KEYS_ARR.map((s) => {
              const active = lineSizes[index] === s;
              return (
                <button
                  key={s}
                  onClick={() => setLineSize(index, s)}
                  title={t(SIZE_TKEY[s])}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: active ? (isDark ? "#fff" : "#222222") : "transparent",
                    color: active ? (isDark ? "#222222" : "#fff") : (isDark ? "#fff" : "#222222"),
                    fontWeight: 700,
                    border: isDark ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(0,0,0,0.25)",
                    cursor: "pointer",
                    fontSize: SIZE_FONT[s],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  {t(SIZE_TKEY[s])}
                </button>
              );
            })}
          </div>
        </div>
        {limit !== undefined && (() => {
          const over = lines[index].length > limit;
          return (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
              {over ? (
                <span style={{ color: "#E53935", fontWeight: 600 }}>
                  ⚠ Text too long for this size — shorten or pick a smaller size
                </span>
              ) : <span />}
              <span style={{ color: over ? "#E53935" : (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"), fontWeight: over ? 700 : 400 }}>
                {lines[index].length} / {limit}
              </span>
            </div>
          );
        })()}
      </div>
    );
  };

  const latinFonts = FONTS.filter((f) => f.lang === "latin");
  const chineseFonts = FONTS.filter((f) => f.lang === "chinese");

  const fontBtn = (f: FontDef) => {
    const active = font === f.key;
    return (
      <button
        key={f.key}
        onClick={() => onFontChange(f.key)}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: active ? (isDark ? "#fff" : "#222222") : "transparent",
          color: active ? (isDark ? "#222222" : "#fff") : (isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)"),
          border: active
            ? (isDark ? "1.5px solid #fff" : "1.5px solid #222222")
            : (isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.15)"),
          cursor: "pointer",
          fontFamily: f.family,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: 0.3,
          textAlign: "center",
          transition: "background 0.2s, color 0.2s, border-color 0.2s",
          width: "100%",
        }}
      >
        {f.label}
      </button>
    );
  };

  return (
    <div style={{ width: "100%", maxWidth: 720, color: isDark ? "#fff" : "#222222", transition: "color 0.5s ease" }}>
      <h2 style={{ color: isDark ? "#fff" : "#222222", textAlign: "center", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: "8px 0 20px", transition: "color 0.5s ease" }}>
        {t("sectionHeader")}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Lines */}
        <div style={cardStyle}>
          <div style={labelStyle}>{t("lines")}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 14 }}>
            {([1, 2] as const).map((n) => (
              <button key={n} onClick={() => onLineCountChange(n)} style={pillStyle(lineCount === n)}>
                {n === 1 ? t("lineCount1") : t("lineCount2")}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {renderLineRow(0)}
            {lineCount === 2 && renderLineRow(1)}
          </div>
        </div>

        {/* Font style — two columns */}
        <div style={cardStyle}>
          <div style={labelStyle}>{t("fontStyle")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

            {/* Latin */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", marginBottom: 4, textAlign: "center" }}>
                Latin
              </div>
              {latinFonts.map(fontBtn)}
            </div>

            {/* Chinese */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", marginBottom: 4, textAlign: "center" }}>
                中文
              </div>
              {chineseFonts.map(fontBtn)}
            </div>

          </div>
        </div>

        {/* Position */}
        <div style={cardStyle}>
          <div style={labelStyle}>{t("position")}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={() => onPositionChange("top")} style={pillStyle(position === "top")}>{t("positionTop")}</button>
            <button onClick={() => onPositionChange("bottom")} style={pillStyle(position === "bottom")}>{t("positionBottom")}</button>
          </div>
        </div>

        {/* Thread color */}
        <div style={cardStyle}>
          <div style={labelStyle}>{t("threadColor")}</div>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

            {/* 10 preset swatches — 5×2 grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 32px)", gap: 8, flexShrink: 0 }}>
              {THREAD_COLOR_PRESETS.map((preset) => {
                const active = color.toUpperCase() === preset.value.toUpperCase();
                return (
                  <button
                    key={preset.value}
                    title={preset.name}
                    onClick={() => onColorChange(preset.value)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: preset.value,
                      border: active
                        ? (isDark ? "2.5px solid #fff" : "2.5px solid #222")
                        : (isDark ? "1.5px solid rgba(255,255,255,0.2)" : "1.5px solid rgba(0,0,0,0.12)"),
                      boxShadow: active ? "0 0 0 2px rgba(0,0,0,0.18)" : "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "border 0.15s, box-shadow 0.15s",
                    }}
                  />
                );
              })}
            </div>

            {/* Custom color picker + hex input */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
              <label style={{ position: "relative", cursor: "pointer" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10, background: color,
                  border: isDark ? "2px solid rgba(255,255,255,0.25)" : "2px solid rgba(0,0,0,0.15)",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.16)",
                  transition: "background 0.15s ease",
                }} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                  style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }}
                />
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)" }}>#</span>
                <input
                  type="text"
                  maxLength={7}
                  value={color.replace(/^#/, "").toUpperCase()}
                  onChange={(e) => handleHexInput(e.target.value)}
                  style={{ ...inputStyle, flex: "none", width: 80, textAlign: "center", fontFamily: "monospace", fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", padding: "6px 8px" }}
                />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
