"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type Props = {
  invert?: boolean;
};

export default function SubNav({ invert = false }: Props) {
  // Active highlight uses startsWith so nested routes (if added later) keep
  // their parent tab lit. usePathname returns null during the very first
  // render in some Next versions; treat that as no match.
  const pathname = usePathname();
  const t = useTranslations("nav");

  const links = [
    { href: "/", label: t("home") },
    { href: "/gallery", label: t("lookbook") },
    { href: "/customize", label: t("customize") },
    { href: "/shop", label: t("shop") },
  ];

  const backdrop = invert
    ? "rgba(255,255,255,0.55)"
    : "rgba(20,20,20,0.45)";
  const borderBottom = invert
    ? "1px solid rgba(0,0,0,0.06)"
    : "1px solid rgba(255,255,255,0.06)";
  const inactiveColor = invert
    ? "rgba(0,0,0,0.55)"
    : "rgba(255,255,255,0.6)";
  const activeColor = invert ? "#000" : "#fff";
  const activeUnderline = invert
    ? "rgba(0,0,0,0.85)"
    : "rgba(255,255,255,0.85)";

  // Stickiness is handled by the SiteHeader wrapper that mounts both bars in
  // one sticky stack — this nav just lays out inline below the header.
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 0,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: "max(20px, env(safe-area-inset-left))",
        paddingRight: "max(20px, env(safe-area-inset-right))",
        background: backdrop,
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        borderBottom,
        // Allow horizontal scrolling on narrow phones rather than wrapping
        // the labels onto two lines.
        overflowX: "auto",
        whiteSpace: "nowrap",
        scrollbarWidth: "none",
      }}
    >
      <div style={{ display: "flex", gap: 28 }}>
        {links.map((link) => {
          // Home needs exact match — every path starts with "/", so a naive
          // startsWith would keep the Home tab lit on every page.
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(link.href) ?? false;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                textDecoration: "none",
                color: active ? activeColor : inactiveColor,
                paddingBottom: 4,
                borderBottom: active
                  ? `2px solid ${activeUnderline}`
                  : "2px solid transparent",
                transition: "color 160ms ease, border-color 160ms ease",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
