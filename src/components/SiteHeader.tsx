"use client";

import Link from "next/link";

const LOGO_SRC = "/logo/logo.png";

type Props = {
  // Some pages (the customizer) sit on a dark gradient where the white logo
  // works as-is. Lighter pages (the invoice) need it inverted to black.
  invert?: boolean;
};

export default function SiteHeader({ invert = false }: Props) {
  // Sticky across every page. The translucent backdrop + blur matches the
  // glass-card aesthetic used elsewhere and keeps the logo legible while page
  // content scrolls underneath. z-index 50 sits above the invoice page's
  // fixed action bar (z 20) and any in-page popovers (z 10).
  const backdrop = invert
    ? "rgba(255,255,255,0.7)"
    : "rgba(20,20,20,0.55)";
  const borderBottom = invert
    ? "1px solid rgba(0,0,0,0.08)"
    : "1px solid rgba(255,255,255,0.08)";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        padding: "12px 16px",
        background: backdrop,
        backdropFilter: "blur(16px) saturate(160%)",
        WebkitBackdropFilter: "blur(16px) saturate(160%)",
        borderBottom,
      }}
    >
      <Link
        href="/"
        aria-label="Home"
        style={{ display: "inline-flex", alignItems: "center" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_SRC}
          alt="Computex Systems"
          style={{
            height: 56,
            objectFit: "contain",
            filter: invert ? "brightness(0)" : undefined,
          }}
        />
      </Link>
    </header>
  );
}
