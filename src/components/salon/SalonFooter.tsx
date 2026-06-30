import SALON_COPY from "@/app/salon/copy";

export default function SalonFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
        padding: "24px",
        textAlign: "center",
        fontSize: "var(--fs-sm)",
        letterSpacing: "var(--ls-caps)",
        textTransform: "uppercase",
        opacity: 0.6,
        marginTop: "auto",
      }}
    >
      {SALON_COPY.footerNote}
    </footer>
  );
}
