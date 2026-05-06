"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Gallery, { type GalleryImage } from "@/components/Gallery";
import SizeVisualizer from "@/components/SizeVisualizer";
import type { AdImage } from "@/lib/loadAdvertisements";
import CommunityGallery from "@/components/CommunityGallery";

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
};

const sectionHeaderStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: 2,
  margin: "0 0 24px",
  color: "#fff",
};

const AD_SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const AD_CARD_W = "clamp(280px, 92vw, 900px)";

type Props = {
  ads: AdImage[];
};

export default function GalleryPageClient({ ads }: Props) {
  const t = useTranslations("gallery");
  const [selectedBag, setSelectedBag] = useState<GalleryImage | null>(null);

  return (
    <>
      {ads.length > 0 && (
        <section style={{ ...sectionStyle, marginTop: 8 }}>
          <AdRail ads={ads} />
        </section>
      )}

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
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 22,
          padding: "32px 28px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
          Community Studio
        </p>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: 0.5, color: "#fff", lineHeight: 1.2 }}>
          Want to design your own?
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 440 }}>
          Head to Studio to pick your colors, submit your vote, and see this season's top styles. The most popular design at season close gets made — and voters get first access.
        </p>
        <a
          href="/studio"
          style={{
            display: "inline-block",
            marginTop: 4,
            padding: "13px 28px",
            borderRadius: 999,
            background: "#fff",
            color: "#111",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: 0.5,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
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

function AdRail({ ads }: { ads: AdImage[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const update = () => {
      const r = track.getBoundingClientRect();
      const center = r.left + r.width / 2;
      let bestIdx = 0;
      let bestDist = Infinity;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const ir = el.getBoundingClientRect();
        const ic = ir.left + ir.width / 2;
        const d = Math.abs(ic - center);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      setActiveIdx(bestIdx);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        marginInline: "calc(50% - 50vw)",
        width: "100vw",
      }}
    >
      <style>{`.ad-track::-webkit-scrollbar{display:none}`}</style>
      <div
        ref={trackRef}
        className="ad-track"
        style={{
          display: "flex",
          gap: 18,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBlock: 12,
          paddingInline: `calc(50vw - (${AD_CARD_W}) / 2)`,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        }}
      >
        {ads.map((ad, i) => {
          const active = i === activeIdx;
          return (
            <div
              key={ad.src}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              onClick={() => {
                itemRefs.current[i]?.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center",
                });
              }}
              style={{
                position: "relative",
                flex: "0 0 auto",
                width: AD_CARD_W,
                aspectRatio: "9 / 16",
                scrollSnapAlign: "center",
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
                cursor: "pointer",
                background:
                  "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
                boxShadow: active
                  ? "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18)"
                  : "0 8px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.14)",
                transform: active ? "scale(1)" : "scale(0.9)",
                opacity: active ? 1 : 0.5,
                transition: `transform 0.6s ${AD_SMOOTH_EASE}, opacity 0.6s ${AD_SMOOTH_EASE}, box-shadow 0.6s ${AD_SMOOTH_EASE}`,
                willChange: "transform, opacity",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ad.src}
                alt={ad.alt}
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  userSelect: "none",
                }}
              />
            </div>
          );
        })}
      </div>

      {ads.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 14,
          }}
          aria-hidden
        >
          <div
            style={{
              position: "relative",
              width: 220,
              height: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.18)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: `${((activeIdx + 1) / ads.length) * 100}%`,
                borderRadius: 999,
                background: "rgba(255,255,255,0.88)",
                transition: `width 0.4s ${AD_SMOOTH_EASE}`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
