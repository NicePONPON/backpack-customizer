"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

type Props = {
  companyName?: string;
  invert?: boolean;
};

export default function SiteFooter({ companyName, invert }: Props) {
  const t = useTranslations("footer");
  const { theme } = useTheme();
  const company = companyName ?? t("defaultCompany");

  const isLight = invert !== undefined ? invert : theme === "light";

  const iconColor = isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)";
  const iconHoverColor = isLight ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)";

  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
        marginTop: 16,
        color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)",
        fontSize: 12,
        lineHeight: 1.6,
        letterSpacing: 0.3,
        transition: "color 0.5s ease",
      }}
    >
      {/* Social icons row — Peak Design style */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 16 }}>
        <a
          href="https://www.instagram.com/computexsystems.co"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on Instagram"
          style={{
            color: iconColor,
            transition: "color 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = iconHoverColor)}
          onMouseLeave={e => (e.currentTarget.style.color = iconColor)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>

      <div>{t("copyright", { company })}</div>
      <div>{t("tagline")}</div>
    </footer>
  );
}
