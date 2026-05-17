"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageToggle from "./LanguageToggle";
import HamburgerDrawer from "./HamburgerDrawer";
import { useTheme } from "@/lib/ThemeContext";

const LOGO_SRC = "/logo/logo.png";

type Props = {
  invert?: boolean;
};


export default function SiteHeader({ invert: invertProp }: Props) {
  const t = useTranslations("header");
  const { theme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLight = invertProp !== undefined ? invertProp : theme === "light";

  const backdrop = isLight ? "rgba(255,255,255,0.7)" : "rgba(20,20,20,0.55)";
  const borderBottom = isLight
    ? "1px solid rgba(0,0,0,0.08)"
    : "1px solid rgba(255,255,255,0.08)";
  const hamburgerColor = isLight ? "#333" : "rgba(255,255,255,0.8)";

  return (
    <>
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
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
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
          {/* Left: hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              justifySelf: "start",
            }}
          >
            <span style={{ display: "block", width: 22, height: 1.5, background: hamburgerColor }} />
            <span style={{ display: "block", width: 22, height: 1.5, background: hamburgerColor }} />
            <span style={{ display: "block", width: 22, height: 1.5, background: hamburgerColor }} />
          </button>

          {/* Centre: logo */}
          <Link
            href="/"
            aria-label={t("homeAriaLabel")}
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Computex Systems"
              style={{
                height: 56,
                objectFit: "contain",
                filter: isLight ? "brightness(0)" : undefined,
                opacity: isLight ? 0.65 : 1,
              }}
            />
          </Link>

          {/* Right: language toggle */}
          <div style={{ justifySelf: "end" }}>
            <LanguageToggle />
          </div>
        </header>
      </div>

      <HamburgerDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
