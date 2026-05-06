"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageToggle from "./LanguageToggle";
import CurrencySelector from "./CurrencySelector";
import SubNav from "./SubNav";
import { useTheme } from "@/lib/ThemeContext";

const LOGO_SRC = "/logo/logo.png";

type Props = {
  // Some pages (the customizer) sit on a dark gradient where the white logo
  // works as-is. Lighter pages (the invoice) need it inverted to black.
  invert?: boolean;
  // The invoice page renders inside an export-captured A4 frame and doesn't
  // want a sub-nav baked into the screenshot. Defaults to showing it.
  showSubNav?: boolean;
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

export default function SiteHeader({ invert: invertProp, showSubNav = true }: Props) {
  const t = useTranslations("header");
  const { theme, toggle } = useTheme();

  // Pages that pass `invert` explicitly (invoice) override the theme.
  // All other pages follow the global theme toggle.
  const isLight = invertProp !== undefined ? invertProp : theme === "light";

  const backdrop = isLight ? "rgba(255,255,255,0.7)" : "rgba(20,20,20,0.55)";
  const borderBottom = isLight
    ? "1px solid rgba(0,0,0,0.08)"
    : "1px solid rgba(255,255,255,0.08)";
  const iconColor = isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";

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
        {/* Left: theme toggle */}
        <button
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 6,
            borderRadius: 8,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "color 0.3s ease, opacity 0.3s ease",
            justifySelf: "start",
          }}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
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
            }}
          />
        </Link>

        {/* Right: language on top, currency below */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            width: 88,
            justifySelf: "end",
          }}
        >
          <LanguageToggle />
          <CurrencySelector invert={isLight} />
        </div>
      </header>
      {showSubNav && <SubNav invert={isLight} />}
    </div>
  );
}
