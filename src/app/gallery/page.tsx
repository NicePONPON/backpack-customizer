"use client";

import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Gallery, { type GalleryImage } from "@/components/Gallery";
import SizeVisualizer from "@/components/SizeVisualizer";

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#555555, #222222)",
  backgroundAttachment: "fixed",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0 24px 48px",
  gap: 48,
  color: "#fff",
};

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

// Advertisement panel — drop new PNGs into public/advertisement/ and add
// their filenames here. Each entry renders as one card in the scroll-snap
// rail (same UX as the photo gallery below). Single entries still render
// in the rail; with one card the snap is a no-op.
const AD_IMAGES: ReadonlyArray<{ src: string; alt: string }> = [
  { src: "/advertisement/AD-Hero.png", alt: "Computex hero advertisement" },
  {
    src: "/advertisement/AD-Comparison.png",
    alt: "Computex vs. competitors comparison",
  },
  {
    src: "/advertisement/AD-Segregation.png",
    alt: "Computex backpack compartment segregation",
  },
];

const AD_SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
// Hero-scale cards: ads are the primary marketing surface above the
// gallery, so the active card spans nearly the full content width — same
// visual weight as the pre-rail version. Inactive neighbors still peek in
// past the edge mask thanks to the scale(0.9) shrink.
const AD_CARD_W = "clamp(280px, 92vw, 900px)";

export default function GalleryPage() {
  const [selectedBag, setSelectedBag] = useState<GalleryImage | null>(null);

  return (
    <main style={pageBg}>
      <SiteHeader />

      {/* ADVERTISEMENT — sits above the gallery to highlight comparison /
          marketing content before the user scrolls into product photos. */}
      <section style={{ ...sectionStyle, marginTop: 8 }}>
        <AdvertisementPanel />
      </section>

      {/* GALLERY */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>GALLERY</h2>
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

      <SiteFooter />
    </main>
  );
}

function AdvertisementPanel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  // Center-detection mirror of Gallery.tsx — find which card is closest to
  // the track's horizontal center on every scroll/resize, then drive the
  // active card's scale/opacity from that index.
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
        {AD_IMAGES.map((ad, i) => {
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

      {AD_IMAGES.length > 1 && (
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
                width: `${((activeIdx + 1) / AD_IMAGES.length) * 100}%`,
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
