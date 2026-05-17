"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageToggle from "./LanguageToggle";
import CurrencySelector from "./CurrencySelector";
import HamburgerDrawer from "./HamburgerDrawer";
import { useTheme } from "@/lib/ThemeContext";

const LOGO_SRC = "/logo/logo.png";

type Props = {
  invert?: boolean;
};

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function SiteHeader({ invert: invertProp }: Props) {
  const t = useTranslations("header");
  const { theme, toggle } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isLight = invertProp !== undefined ? invertProp : theme === "light";

  const backdrop = isLight ? "rgba(255,255,255,0.7)" : "rgba(20,20,20,0.55)";
  const borderBottom = isLight
    ? "1px solid rgba(0,0,0,0.08)"
    : "1px solid rgba(255,255,255,0.08)";
  const iconColor = isLight ? "rgba(51,51,51,0.7)" : "rgba(255,255,255,0.6)";
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
                filter: isLight ? "brightness(0) brightness(0.2)" : undefined,
              }}
            />
          </Link>

          {/* Right: theme toggle + language + currency */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              justifySelf: "end",
            }}
          >
            <button
              onClick={toggle}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 8,
                color: iconColor,
                display: "flex",
                alignItems: "center",
                transition: "color 0.3s ease",
              }}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: 88 }}>
              <LanguageToggle />
              <CurrencySelector invert={isLight} />
            </div>
          </div>
        </header>
      </div>

      <HamburgerDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
