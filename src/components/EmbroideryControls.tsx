"use client";

export type EmbroideryPosition = "top" | "bottom";
export type EmbroideryColor =
  | "#000000"
  | "#FFFFFF"
  | "#808080"
  | "#D32F2F"
  | "#1976D2"
  | "#FBC02D";

export const EMBROIDERY_COLORS: Array<{ value: EmbroideryColor; name: string }> =
  [
    { value: "#000000", name: "Black" },
    { value: "#FFFFFF", name: "White" },
    { value: "#808080", name: "Gray" },
    { value: "#D32F2F", name: "Red" },
    { value: "#1976D2", name: "Blue" },
    { value: "#FBC02D", name: "Yellow" },
  ];

type Props = {
  lines: [string, string];
  lineCount: 1 | 2;
  color: EmbroideryColor;
  position: EmbroideryPosition;
  onLinesChange: (next: [string, string]) => void;
  onLineCountChange: (next: 1 | 2) => void;
  onColorChange: (next: EmbroideryColor) => void;
  onPositionChange: (next: EmbroideryPosition) => void;
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #888",
  background: "#1b1b1b",
  color: "#fff",
  fontSize: 14,
};

export default function EmbroideryControls({
  lines,
  lineCount,
  color,
  position,
  onLinesChange,
  onLineCountChange,
  onColorChange,
  onPositionChange,
}: Props) {
  const setLine = (index: 0 | 1, value: string) => {
    const next: [string, string] = [lines[0], lines[1]];
    next[index] = value;
    onLinesChange(next);
  };

  return (
    <div style={{ width: "100%", maxWidth: 900, color: "#fff" }}>
      <div style={{ textAlign: "center", marginBottom: 14, fontWeight: 700 }}>
        Embroidery
      </div>

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
            {n} line{n === 2 ? "s" : ""}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <input
          style={inputStyle}
          value={lines[0]}
          onChange={(e) => setLine(0, e.target.value)}
          placeholder="Line 1"
        />
        {lineCount === 2 && (
          <input
            style={inputStyle}
            value={lines[1]}
            onChange={(e) => setLine(1, e.target.value)}
            placeholder="Line 2"
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <button
          onClick={() => onPositionChange("top")}
          style={pillStyle(position === "top")}
        >
          Front Top
        </button>
        <button
          onClick={() => onPositionChange("bottom")}
          style={pillStyle(position === "bottom")}
        >
          Front Bottom
        </button>
      </div>

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
            <div style={{ fontSize: 12, color: "#e4e4e4" }}>{c.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
