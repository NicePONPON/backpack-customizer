"use client";

type Props = {
  companyName?: string;
  invert?: boolean;
};

export default function SiteFooter({
  companyName = "Computex Systems Investments (PTY) LTD",
  invert = false,
}: Props) {
  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
        marginTop: 16,
        color: invert ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.45)",
        fontSize: 12,
        lineHeight: 1.6,
        letterSpacing: 0.3,
      }}
    >
      <div>© 2026 {companyName}. All rights reserved.</div>
      <div>Designed and engineered for modern everyday carry.</div>
    </footer>
  );
}
