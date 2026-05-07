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

  return (
    <div style={{ width: "100%", maxWidth: 720, color: isDark ? "#fff" : "#222222", transition: "color 0.5s ease" }}>
      <h2 style={{ color: isDark ? "#fff" : "#222222", textAlign: "center", fontSize: 22, fontWeight: 700, letterSpacing: 2, margin: "8px 0 20px", transition: "color 0.5s ease" }}>
        {t("sectionHeader")}
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={cardStyle}>
          <div style={{ color: isDark ? "#fff" : "#222222", textAlign: "center", marginBottom: 12, fontWeight: 600, letterSpacing: 0.5, transition: "color 0.5s ease" }}>
            {t("style")}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <button onClick={() => onEnabledChange(false)} style={pillStyle(!enabled)}>
              {t("stock")}
            </button>
            <button onClick={() => onEnabledChange(true)} style={pillStyle(enabled)}>
              {t("paracord")}
            </button>
          </div>
        </div>

        {enabled && (
          <div style={cardStyle}>
            <div style={{ color: isDark ? "#fff" : "#222222", textAlign: "center", marginBottom: 12, fontWeight: 600, letterSpacing: 0.5, transition: "color 0.5s ease" }}>
              {t("paracordColor")}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              {ZIPPER_COLORS.map((c) => (
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
                      border: color === c.value ? "3px solid #4aa3ff" : "1px solid #444",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ fontSize: 12, color: isDark ? "#e4e4e4" : "rgba(0,0,0,0.55)", marginTop: 6, transition: "color 0.5s ease" }}>
                    {tColors(`swatches.${c.key}`)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
