"use client";

import { useTranslations } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { COUNTRIES, flagSrc } from "@/lib/countries";
import { useTheme } from "@/lib/ThemeContext";

// TODO: replace with real distributor / regional e-commerce URLs once supplied.
const DISTRIBUTOR_URLS: Record<string, string> = {
  TW: "#",
  SZ: "#",
  ZA: "#",
  US: "#",
};

export default function ShopPage() {
  const t = useTranslations("shop");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pageBg: React.CSSProperties = {
    minHeight: "100vh",
    backgroundImage: isDark
      ? "linear-gradient(#555555, #222222)"
      : "linear-gradient(#ffffff, #FDFAF3)",
    backgroundAttachment: "fixed",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px 48px",
    gap: 32,
    color: isDark ? "#fff" : "#222222",
    transition: "background-image 0.5s ease, color 0.5s ease",
  };

  const cardStyle: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)"
      : "rgba(255,255,255,0.65)",
    border: isDark
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(255,255,255,0.85)",
    borderRadius: 20,
    padding: "28px 24px 24px",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)"
      : "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
    textDecoration: "none",
    color: "inherit",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 12,
    minHeight: 220,
    transition: "background 0.5s ease, border-color 0.5s ease",
  };

  return (
    <main style={pageBg}>
      <SiteHeader />

      <section
        style={{
          width: "100%",
          maxWidth: 720,
          textAlign: "center",
          marginTop: -8,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: 0.5,
            lineHeight: 1.15,
            margin: 0,
            ...(isDark
              ? {
                  background: "linear-gradient(180deg, #ffffff 0%, #c9c9c9 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }
              : { color: "#222222", WebkitTextFillColor: "#222222" }),
          }}
        >
          {t("heading")}
        </h1>
        <p
          style={{
            color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
            fontSize: 15,
            margin: "10px 0 0",
            letterSpacing: 0.3,
            transition: "color 0.5s ease",
          }}
        >
          {t("subheading")}
        </p>
      </section>

      <section
        style={{
          width: "100%",
          maxWidth: 880,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {COUNTRIES.map((c) => {
          const url = DISTRIBUTOR_URLS[c.code] ?? "#";
          const tagline = (() => {
            try {
              return t(`regionTagline.${c.code}`);
            } catch {
              return "";
            }
          })();
          return (
            <a
              key={c.code}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={cardStyle}
            >
              <FlagCircle code={c.code} size={88} isDark={isDark} />
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: isDark ? "#fff" : "#222222",
                  letterSpacing: 0.3,
                  transition: "color 0.5s ease",
                }}
              >
                {c.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)",
                  lineHeight: 1.5,
                  flex: 1,
                  transition: "color 0.5s ease",
                }}
              >
                {tagline}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: isDark ? "#fff" : "#222222",
                  transition: "color 0.5s ease",
                }}
              >
                {t("visitCta")}
              </div>
            </a>
          );
        })}
      </section>

      <SiteFooter />
    </main>
  );
}

function FlagCircle({ code, size, isDark }: { code: string; size: number; isDark: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: isDark ? "#222" : "#e8e8e8",
        border: isDark
          ? "2px solid rgba(255,255,255,0.18)"
          : "2px solid rgba(0,0,0,0.1)",
        flexShrink: 0,
        transition: "background 0.5s ease, border-color 0.5s ease",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagSrc(code)}
        alt={code}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </span>
  );
}
