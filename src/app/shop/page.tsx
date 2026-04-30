"use client";

import { useTranslations } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { COUNTRIES, flagSrc } from "@/lib/countries";

// TODO: replace with real distributor / regional e-commerce URLs once supplied.
// Keys map to ISO 3166-1 alpha-2 country codes from src/lib/countries.ts.
const DISTRIBUTOR_URLS: Record<string, string> = {
  TW: "#",
  SZ: "#",
  ZA: "#",
  US: "#",
};

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#555555, #222222)",
  backgroundAttachment: "fixed",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0 24px 48px",
  gap: 32,
  color: "#fff",
};

const cardStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 20,
  padding: "28px 24px 24px",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
  textDecoration: "none",
  color: "inherit",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  gap: 12,
  minHeight: 220,
};

export default function ShopPage() {
  const t = useTranslations("shop");
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
            background: "linear-gradient(180deg, #ffffff 0%, #c9c9c9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {t("heading")}
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 15,
            margin: "10px 0 0",
            letterSpacing: 0.3,
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
              <FlagCircle code={c.code} size={88} />
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#fff",
                  letterSpacing: 0.3,
                }}
              >
                {c.name}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.5,
                  flex: 1,
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
                  color: "#fff",
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

function FlagCircle({ code, size }: { code: string; size: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#222",
        border: "2px solid rgba(255,255,255,0.18)",
        flexShrink: 0,
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
