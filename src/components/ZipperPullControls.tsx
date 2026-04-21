"use client";

export const ZIPPER_COLORS = [
  { name: "Ivory Dune", value: "#FFF6DF" },
  { name: "Ash Steel", value: "#727576" },
] as const;

export type ZipperColor = (typeof ZIPPER_COLORS)[number]["value"];

type Props = {
  enabled: boolean;
  color: string;
  onEnabledChange: (next: boolean) => void;
  onColorChange: (next: string) => void;
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

export default function ZipperPullControls({
  enabled,
  color,
  onEnabledChange,
  onColorChange,
}: Props) {
  return (
    <div style={{ width: "100%", maxWidth: 720, color: "#fff" }}>
      <h2 style={sectionHeaderStyle}>ZIPPER PULL UPGRADE</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={cardStyle}>
          <div style={cardTitleStyle}>Style</div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <button
              onClick={() => onEnabledChange(false)}
              style={pillStyle(!enabled)}
            >
              Stock
            </button>
            <button
              onClick={() => onEnabledChange(true)}
              style={pillStyle(enabled)}
            >
              Paracord
            </button>
          </div>
        </div>

        {enabled && (
          <div style={cardStyle}>
            <div style={cardTitleStyle}>Paracord color</div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
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
                      border:
                        color === c.value
                          ? "3px solid #4aa3ff"
                          : "1px solid #444",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#e4e4e4", marginTop: 6 }}>
                    {c.name}
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
