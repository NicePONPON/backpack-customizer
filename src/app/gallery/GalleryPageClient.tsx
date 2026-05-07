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
    color: isDark ? "#fff" : "#222222",
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
            : "rgba(255,255,255,0.65)",
          backdropFilter: "blur(24px) saturate(200%)",
          WebkitBackdropFilter: "blur(24px) saturate(200%)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.12)"
            : "1px solid rgba(255,255,255,0.85)",
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
          {t("galleryCta.label")}
        </p>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 0.5, color: isDark ? "#fff" : "#222222", lineHeight: 1.2, transition: "color 0.5s ease" }}>
          {t("galleryCta.heading")}
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", lineHeight: 1.7, maxWidth: 440, transition: "color 0.5s ease" }}>
          {t("galleryCta.desc")}
        </p>
        <a
          href="/studio"
          style={{
            display: "inline-block",
            marginTop: 4,
            padding: "13px 28px",
            borderRadius: 999,
            background: isDark ? "#fff" : "#222222",
            color: isDark ? "#222222" : "#fff",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 0.5,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            transition: "background 0.5s ease, color 0.5s ease",
          }}
        >
          {t("galleryCta.cta")}
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
          isActive={i === activeIdx}
          onVisible={() => setActiveIdx(i)}
        />
      ))}
    </div>
  );
}

function AppleAdSection({
  ad,
  index,
  total,
  isActive,
  onVisible,
}: {
  ad: AdImage;
  index: number;
  total: number;
  isActive: boolean;
  onVisible: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          onVisibleRef.current();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  // 80px of empty padding on each inter-section edge — the fade happens entirely
  // within that space so no image content is ever clipped by the gradient mask.
  const FADE = 80;
  const paddingTop = isFirst ? 0 : FADE;
  const paddingBottom = isLast ? 0 : FADE;
  const maskGradient = isFirst
    ? `linear-gradient(to bottom, black 0, black calc(100% - ${FADE}px), transparent 100%)`
    : isLast
    ? `linear-gradient(to bottom, transparent 0, black ${FADE}px, black 100%)`
    : `linear-gradient(to bottom, transparent 0, black ${FADE}px, black calc(100% - ${FADE}px), transparent 100%)`;

  return (
    // Outer wrapper: owns the padding + mask so fading zones are pure empty space
    <div
      ref={ref}
      style={{
        paddingTop,
        paddingBottom,
        maskImage: maskGradient,
        WebkitMaskImage: maskGradient,
      }}
    >
      {/* Inner container: clips the scale-reveal overflow */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Full-width image — fades in and zooms to natural scale when revealed */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.src}
          alt={ad.alt}
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            opacity: revealed ? 1 : 0,
            transform: revealed ? "scale(1)" : "scale(1.06)",
            transition: "opacity 1.2s ease, transform 1.6s cubic-bezier(0.2, 0, 0, 1)",
            willChange: "transform, opacity",
            userSelect: "none",
          }}
        />

        {/* Bottom scrim */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 30%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        {/* Bottom info row: slide counter */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            right: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s",
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
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {index + 1} / {total}
          </p>
        </div>

        {/* Top label on first section */}
        {isFirst && (
          <div
            style={{
              position: "absolute",
              top: 32,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              opacity: revealed ? 1 : 0,
              transition: "opacity 1s ease 0.6s",
              pointerEvents: "none",
            }}
          >
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: 3.5, textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
              Lookbook
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
