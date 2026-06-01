"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { COUNTRIES, flagSrc } from "@/lib/countries";
import { useTheme } from "@/lib/ThemeContext";
import ScrollNav from "@/components/ScrollNav";

// TODO: replace with real distributor / regional e-commerce URLs once supplied.
const DISTRIBUTOR_URLS: Record<string, string> = {
  SZ: "#",
  ZA: "#",
  US: "#",
};

type TwShop = {
  name: string;
  nameEn: string;
  tagline: string;
  url: string;
  bg: string;
  logo: React.ReactNode;
};

const TW_SHOPS: TwShop[] = [
  {
    name: "全家便利商店",
    nameEn: "FamilyMart",
    tagline: "便利超商線上購物",
    url: "https://famistore.famiport.com.tw/famistore/users/6053766/malls/6a1c4027990f2a85c095c651",
    bg: "#00a651",
    logo: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/logos/familymart.png" alt="FamilyMart" style={{ width: 96, height: 96, objectFit: "contain", filter: "drop-shadow(0 3px 8px rgba(0,166,81,0.45))" }} />
    ),
  },
  {
    name: "蝦皮購物",
    nameEn: "Shopee",
    tagline: "即將上架，敬請期待",
    url: "#",
    bg: "#ee4d2d",
    logo: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/logos/shopee.png" alt="Shopee" style={{ width: 96, height: 96, objectFit: "contain", filter: "drop-shadow(0 3px 8px rgba(238,77,45,0.45))" }} />
    ),
  },
  {
    name: "安彭國際貿易",
    nameEn: "Direct Inquiry",
    tagline: "anpeng.trading@gmail.com",
    url: "mailto:anpeng.trading@gmail.com",
    bg: "#4a7fcb",
    logo: (
      <svg viewBox="0 0 80 80" width={96} height={96} fill="none" style={{ filter: "drop-shadow(0 3px 8px rgba(74,127,203,0.45))" }}>
        <rect x={8} y={20} width={64} height={44} rx={8} fill="#4a7fcb" />
        <path d="M8 26 L40 52 L72 26" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
];

export default function ShopPage() {
  const t = useTranslations("shop");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [twModalOpen, setTwModalOpen] = useState(false);

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
            fontSize: "var(--fs-lg)",
            fontWeight: 700,
            letterSpacing: "var(--ls-normal)",
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
            fontSize: "var(--fs-md)",
            margin: "10px 0 0",
            letterSpacing: "var(--ls-normal)",
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
          const tagline = (() => {
            try {
              return t(`regionTagline.${c.code}`);
            } catch {
              return "";
            }
          })();

          if (c.code === "TW") {
            return (
              <button
                key={c.code}
                onClick={() => setTwModalOpen(true)}
                style={{
                  ...cardStyle,
                  cursor: "pointer",
                  background: isDark
                    ? "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)"
                    : "rgba(255,255,255,0.65)",
                }}
              >
                <FlagCircle code={c.code} size={88} isDark={isDark} />
                <div
                  style={{
                    fontSize: "var(--fs-md)",
                    color: isDark ? "#fff" : "#222222",
                    letterSpacing: "var(--ls-normal)",
                    transition: "color 0.5s ease",
                  }}
                >
                  {c.name}
                </div>
                <div
                  style={{
                    fontSize: "var(--fs-sm)",
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
                    fontSize: "var(--fs-sm)",
                    letterSpacing: "var(--ls-normal)",
                    color: isDark ? "#fff" : "#222222",
                    transition: "color 0.5s ease",
                  }}
                >
                  {t("visitCta")}
                </div>
              </button>
            );
          }

          const url = DISTRIBUTOR_URLS[c.code] ?? "#";
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
                  fontSize: "var(--fs-md)",
                  color: isDark ? "#fff" : "#222222",
                  letterSpacing: "var(--ls-normal)",
                  transition: "color 0.5s ease",
                }}
              >
                {c.name}
              </div>
              <div
                style={{
                  fontSize: "var(--fs-sm)",
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
                  fontSize: "var(--fs-sm)",
                  letterSpacing: "var(--ls-normal)",
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

      {twModalOpen && (
        <TaiwanShopModal
          isDark={isDark}
          onClose={() => setTwModalOpen(false)}
        />
      )}

      <SiteFooter />
      <ScrollNav />
    </main>
  );
}

function TaiwanShopModal({
  isDark,
  onClose,
}: {
  isDark: boolean;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 400,
          background: isDark
            ? "linear-gradient(160deg, #1a1a1a 0%, #111 100%)"
            : "linear-gradient(160deg, #fff 0%, #f9f7f2 100%)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(0,0,0,0.08)",
          borderRadius: 24,
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: isDark
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FlagCircle code="TW" size={32} isDark={isDark} />
            <div>
              <div
                style={{
                  fontSize: "var(--fs-md)",
                  color: isDark ? "#fff" : "#111",
                  letterSpacing: "var(--ls-normal)",
                }}
              >
                台灣購買通路
              </div>
              <div
                style={{
                  fontSize: "var(--fs-sm)",
                  color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
                  marginTop: 1,
                }}
              >
                Where to buy in Taiwan
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)",
              cursor: "pointer",
              fontSize: "var(--fs-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* 2-column icon grid */}
        <div
          style={{
            padding: "20px 20px 24px",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
          }}
        >
          {TW_SHOPS.map((shop) => {
            const isComingSoon = shop.url === "#";
            const isEmail = shop.url.startsWith("mailto:");
            return (
              <a
                key={shop.nameEn}
                href={isComingSoon ? undefined : shop.url}
                target={isEmail ? undefined : "_blank"}
                rel={isEmail ? undefined : "noopener noreferrer"}
                onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "24px 12px 20px",
                  borderRadius: 18,
                  aspectRatio: "1",
                  background: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(0,0,0,0.07)",
                  textDecoration: "none",
                  color: "inherit",
                  cursor: isComingSoon ? "default" : "pointer",
                  opacity: isComingSoon ? 0.5 : 1,
                  transition: "background 0.15s ease, transform 0.15s ease",
                  textAlign: "center",
                  overflow: "hidden",
                }}
              >
                {/* Icon */}
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {shop.logo}
                </span>

                {/* Name */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div
                    style={{
                      fontSize: "var(--fs-sm)",
                      color: isDark ? "#fff" : "#111",
                      letterSpacing: "var(--ls-normal)",
                      lineHeight: 1.3,
                    }}
                  >
                    {shop.name}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--fs-sm)",
                      color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.38)",
                      letterSpacing: "var(--ls-normal)",
                    }}
                  >
                    {shop.nameEn}
                  </div>
                </div>

                {/* Coming-soon badge */}
                {isComingSoon && (
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      fontSize: "var(--fs-sm)",
                      letterSpacing: "var(--ls-normal)",
                      padding: "2px 7px",
                      borderRadius: 20,
                      background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                    }}
                  >
                    即將上架
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
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
