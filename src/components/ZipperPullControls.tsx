"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

export const ZIPPER_COLORS = [
  { key: "ivoryDune", name: "Ivory Dune", value: "#FFF6DF" },
  { key: "ashSteel", name: "Ash Steel", value: "#727576" },
] as const;

export type ZipperColor = (typeof ZIPPER_COLORS)[number]["value"];

type Props = {
  enabled: boolean;
  color: string;
  onEnabledChange: (next: boolean) => void;
  onColorChange: (next: string) => void;
};

export default function ZipperPullControls({
  enabled,
  color,
  onEnabledChange,
  onColorChange,
}: Props) {
  const t = useTranslations("zipper");
  const tColors = useTranslations("colors");
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  const inputStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: "6px 8px",
    borderRadius: 8,
    border: isDark ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(0,0,0,0.18)",
    background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.8)",
    color: isDark ? "#fff" : "#222222",
    fontSize: 13,
  };

  const handleHexInput = (raw: string) => {
    const val = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onColorChange(val);
  };

  const isPreset = ZIPPER_COLORS.some((c) => c.value.toUpperCase() === color.toUpperCase());

  return (
    <div style={{ width: "100%", maxWidth: 720, color: isDark ? "#fff" : "#222222", transition: "color 0.5s ease" }}>
      <h2 style={{ color: isDark ? "#fff" : "#222222", textAlign: "center", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: "8px 0 20px", transition: "color 0.5s ease" }}>
        {t("sectionHeader")}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Toggle */}
        <div style={cardStyle}>
          <div style={labelStyle}>{t("style")}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={() => onEnabledChange(false)} style={pillStyle(!enabled)}>
              {t("stock")}
            </button>
            <button onClick={() => onEnabledChange(true)} style={pillStyle(enabled)}>
              {t("paracord")}
            </button>
          </div>
        </div>

        {/* Color picker */}
        {enabled && (
          <div style={cardStyle}>
            <div style={labelStyle}>{t("paracordColor")}</div>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>

              {/* Standard goods presets */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                {ZIPPER_COLORS.map((c) => {
                  const active = color.toUpperCase() === c.value.toUpperCase();
                  return (
                    <div key={c.value} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => onColorChange(c.value)}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: c.value,
                        border: active
                          ? (isDark ? "2.5px solid #fff" : "2.5px solid #222")
                          : (isDark ? "1.5px solid rgba(255,255,255,0.2)" : "1.5px solid rgba(0,0,0,0.12)"),
                        outline: active ? (isDark ? "3px solid rgba(255,255,255,0.25)" : "3px solid rgba(0,0,0,0.15)") : "none",
                        outlineOffset: 1,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.14)",
                        transform: active ? "scale(1.12)" : "scale(1)",
                        transition: "border 0.15s, outline 0.15s, transform 0.15s",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.6)", fontWeight: active ? 700 : 400 }}>
                        {tColors(`swatches.${c.key}`)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{
                width: 1,
                alignSelf: "stretch",
                background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                flexShrink: 0,
              }} />

              {/* Custom color picker */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: 0.8,
                  textTransform: "uppercase",
                  color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}>
                  Your exact shade?
                </span>
                <label style={{ position: "relative", cursor: "pointer" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: color,
                    border: !isPreset
                      ? (isDark ? "2.5px solid #fff" : "2.5px solid #222")
                      : (isDark ? "2px solid rgba(255,255,255,0.25)" : "2px solid rgba(0,0,0,0.15)"),
                    boxShadow: "0 2px 10px rgba(0,0,0,0.16)",
                    transition: "background 0.15s ease, border 0.15s",
                  }} />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => onColorChange(e.target.value)}
                    style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0 }}
                  />
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }}>#</span>
                  <input
                    type="text"
                    maxLength={7}
                    value={color.replace(/^#/, "").toUpperCase()}
                    onChange={(e) => handleHexInput(e.target.value)}
                    style={{ ...inputStyle, flex: "none", width: 72, textAlign: "center", fontFamily: "monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}
                  />
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
