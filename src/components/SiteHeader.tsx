"use client";

import Link from "next/link";
import LanguageToggle from "./LanguageToggle";
import SubNav from "./SubNav";

const LOGO_SRC = "/logo/logo.png";

type Props = {
  // Some pages (the customizer) sit on a dark gradient where the white logo
  // works as-is. Lighter pages (the invoice) need it inverted to black.
  invert?: boolean;
  // The invoice page renders inside an export-captured A4 frame and doesn't
  // want a sub-nav baked into the screenshot. Defaults to showing it.
  showSubNav?: boolean;
};

export default function SiteHeader({ invert = false, showSubNav = true }: Props) {
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

  // Both bars share one sticky wrapper so they stack and scroll as a unit —
  // simpler than stacking two independently sticky elements with juggled
  // `top` offsets, and lets the sub-nav inherit the same edge-to-edge
  // breakout trick.
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        width: "100vw",
      }}
    >
      <header
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          // Vertical padding respects the iOS notch / dynamic island.
          // Horizontal padding respects landscape safe-areas on notched phones.
          paddingTop: "max(14px, env(safe-area-inset-top))",
          paddingBottom: 14,
          paddingLeft: "max(20px, env(safe-area-inset-left))",
          paddingRight: "max(20px, env(safe-area-inset-right))",
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
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "max(20px, env(safe-area-inset-right))",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <LanguageToggle />
        </div>
      </header>
      {showSubNav && <SubNav invert={invert} />}
    </div>
  );
}
