"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";
import CurrencySelector from "./CurrencySelector";

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" /><line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" /><line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HamburgerDrawer({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { theme, toggle } = useTheme();
  const isLight = theme === "light";

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const links = [
    { href: "/", label: t("home") },
    { href: "/gallery", label: t("lookbook") },
    { href: "/customize", label: t("customize") },
    { href: "/studio", label: t("studio") },
    { href: "/shop", label: t("shop") },
  ];

  const divider = isLight ? "1px solid #f0f0f0" : "1px solid rgba(255,255,255,0.08)";

  return (
    <>
      {/* Overlay */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 90,
          background: "rgba(0,0,0,0.45)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 280ms ease",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(80vw, 300px)",
          zIndex: 91,
          background: isLight ? "#fff" : "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: isOpen ? "4px 0 32px rgba(0,0,0,0.18)" : "none",
        }}
      >
        {/* Header: currency + close */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: divider,
          }}
        >
          <CurrencySelector invert={isLight} />
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 24,
              lineHeight: 1,
              color: isLight ? "#333" : "rgba(255,255,255,0.7)",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1 }}>
          {links.map((link) => {
            const active =
              link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href) ?? false;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: active
                    ? (isLight ? "#333" : "#fff")
                    : (isLight ? "rgba(51,51,51,0.5)" : "rgba(255,255,255,0.5)"),
                  borderBottom: divider,
                  textDecoration: "none",
                  letterSpacing: 0.2,
                  transition: "color 160ms ease",
                }}
              >
                {link.label}
                <span style={{ color: isLight ? "#ccc" : "rgba(255,255,255,0.2)", fontSize: 16 }}>›</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: theme toggle only */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: divider,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              color: isLight ? "rgba(51,51,51,0.6)" : "rgba(255,255,255,0.5)",
              display: "flex",
              alignItems: "center",
              transition: "color 0.2s ease",
            }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </>
  );
}
