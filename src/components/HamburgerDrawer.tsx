"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function HamburgerDrawer({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const { theme } = useTheme();
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

  return (
    <>
      {/* Overlay — click to close */}
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
        {/* Drawer header: logo + close */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: isLight ? "1px solid #f0f0f0" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.png"
            alt="Computex Systems"
            style={{
              height: 40,
              objectFit: "contain",
              filter: isLight ? "brightness(0) brightness(0.2)" : undefined,
            }}
          />
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
                  borderBottom: isLight ? "1px solid #f0f0f0" : "1px solid rgba(255,255,255,0.06)",
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

        {/* Footer: company logo */}
        <div
          style={{
            padding: 20,
            borderTop: isLight ? "1px solid #f0f0f0" : "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.png"
            alt="Computex Systems"
            style={{
              height: 32,
              objectFit: "contain",
              filter: isLight ? "brightness(0) brightness(0.2)" : undefined,
              opacity: isLight ? 1 : 0.2,
              display: "flex",
            }}
          />
        </div>
      </div>
    </>
  );
}
