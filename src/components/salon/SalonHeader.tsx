import SALON_COPY from "@/app/salon/copy";

export default function SalonHeader() {
  return (
    <header
      style={{
        borderBottom: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
        padding: "20px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)", fontWeight: 600 }}>
        {SALON_COPY.brand}
      </div>
      <div
        style={{
          fontSize: "var(--fs-sm)",
          letterSpacing: "var(--ls-caps)",
          textTransform: "uppercase",
          opacity: 0.6,
          marginTop: 4,
        }}
      >
        {SALON_COPY.tagline}
      </div>
    </header>
  );
}
