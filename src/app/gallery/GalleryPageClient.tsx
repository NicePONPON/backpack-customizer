"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Gallery, { type GalleryImage } from "@/components/Gallery";
import SizeVisualizer from "@/components/SizeVisualizer";
import type { AdImage } from "@/lib/loadAdvertisements";
import CommunityGallery from "@/components/CommunityGallery";
import { useTheme } from "@/lib/ThemeContext";

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
};

type Props = {
  ads: AdImage[];
};

export default function GalleryPageClient({ ads }: Props) {
  const t = useTranslations("gallery");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedBag, setSelectedBag] = useState<GalleryImage | null>(null);

  const sectionHeaderStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
    margin: "0 0 24px",
    color: isDark ? "#fff" : "#111",
    transition: "color 0.5s ease",
  };

  return (
    <>
      {/* Apple-style full-viewport ad sections */}
      {ads.length > 0 && <AppleAdScroll ads={ads} />}

      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>{t("sectionHeading")}</h2>
        <Gallery onActiveChange={setSelectedBag} />
        <SizeVisualizer
          sizeClass={selectedBag?.sizeClass ?? null}
          bagSlot={
            selectedBag ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={encodeURI(selectedBag.src)}
                alt=""
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                }}
              />
            ) : null
          }
        />
      </section>

      {/* Studio CTA */}
      <section
        style={{
          ...sectionStyle,
          background: isDark
            ? "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)"
            : "linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 100%)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(0,0,0,0.1)",
          borderRadius: 22,
          padding: "32px 28px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          transition: "background 0.5s ease, border-color 0.5s ease",
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", transition: "color 0.5s ease" }}>
          Community Studio
        </p>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 0.5, color: isDark ? "#fff" : "#111", lineHeight: 1.2, transition: "color 0.5s ease" }}>
          Want to design your own?
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", lineHeight: 1.7, maxWidth: 440, transition: "color 0.5s ease" }}>
          Head to Studio to pick your colors, submit your vote, and see this season&apos;s top styles. The most popular design at season close gets made — and voters get first access.
        </p>
        <a
          href="/studio"
          style={{
            display: "inline-block",
            marginTop: 4,
            padding: "13px 28px",
            borderRadius: 999,
            background: isDark ? "#fff" : "#111",
            color: isDark ? "#111" : "#fff",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 0.5,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            transition: "background 0.5s ease, color 0.5s ease",
          }}
        >
          Go to Studio →
        </a>
      </section>

      {/* Community top 3 */}
      <section style={sectionStyle}>
        <CommunityGallery />
      </section>
    </>
  );
}

// ── Apple-style vertical ad scroll ──────────────────────────────────────────

function AppleAdScroll({ ads }: { ads: AdImage[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div
      style={{
        marginInline: "calc(50% - 50vw)",
        width: "100vw",
        position: "relative",
      }}
    >
      {ads.map((ad, i) => (
        <AppleAdSection
          key={ad.src}
          ad={ad}
          index={i}
          total={ads.length}
          onVisible={() => setActiveIdx(i)}
        />
      ))}

      {/* Fixed progress dots on the right */}
      {ads.length > 1 && (
        <div
          style={{
            position: "fixed",
            right: 20,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 10,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          {ads.map((_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: i === activeIdx ? 20 : 5,
                borderRadius: 999,
                background: "rgba(255,255,255,0.9)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                transition: "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AppleAdSection({
  ad,
  index,
  total,
  onVisible,
}: {
  ad: AdImage;
  index: number;
  total: number;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          onVisible();
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        height: "100svh",
        overflow: "hidden",
      }}
    >
      {/* Full-bleed image with zoom-in reveal */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.src}
        alt={ad.alt}
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: revealed ? "scale(1)" : "scale(1.07)",
          transition: "transform 1.6s cubic-bezier(0.2, 0, 0, 1)",
          willChange: "transform",
          userSelect: "none",
        }}
      />

      {/* Bottom scrim so the counter stays legible */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.05) 35%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Slide counter */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.9s ease 0.5s, transform 0.9s ease 0.5s",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {index + 1} / {total}
        </p>
      </div>

      {/* Scroll cue arrow — only on first section */}
      {index === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: revealed ? 1 : 0,
            transition: "opacity 1s ease 1s",
            pointerEvents: "none",
            animation: "bob 2s ease-in-out infinite",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 7l6 6 6-6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <style>{`@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }`}</style>
        </div>
      )}
    </div>
  );
}
