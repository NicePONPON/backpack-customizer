"use client";

import { useEffect, useRef, useState } from "react";

export type GalleryImage = { src: string; sizeClass: "14" | "16" };

type GalleryProps = {
  onActiveChange?: (img: GalleryImage) => void;
};

// Photos are pre-scaled in Photoshop — 14" files render visibly smaller than
// 16" files at native size, and saturation is already toned down at the
// source. No runtime size or saturation correction needed.
const IMAGES: GalleryImage[] = [
  { src: "/gallery/14-ivorydune.png", sizeClass: "14" },
  { src: "/gallery/14-frostgrey.png", sizeClass: "14" },
  { src: "/gallery/16-ivorydune.png", sizeClass: "16" },
  { src: "/gallery/16-frostgrey.png", sizeClass: "16" },
];

const COLOR_LABELS: Record<string, string> = {
  ivorydune: "Ivory Dune",
  frostgrey: "Frost Gray",
};

function imageLabel(src: string): string {
  const file = src.split("/").pop()!.replace(/\.png$/i, "");
  const [size, colorRaw] = file.split("-");
  const color = COLOR_LABELS[colorRaw] ?? colorRaw;
  return `${size}" ${color}`;
}

const SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const CARD_W = "clamp(140px, 38vw, 220px)";

export default function Gallery({ onActiveChange }: GalleryProps = {}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    onActiveChange?.(IMAGES[activeIdx]);
  }, [activeIdx, onActiveChange]);

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
      <style>{`.gallery-track::-webkit-scrollbar{display:none}`}</style>
      <div
        ref={trackRef}
        className="gallery-track"
        style={{
          display: "flex",
          gap: 18,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBlock: 12,
          paddingInline: `calc(50vw - (${CARD_W}) / 2)`,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          maskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, #000 8%, #000 92%, transparent 100%)",
        }}
      >
        {IMAGES.map((img, i) => {
          const active = i === activeIdx;
          return (
            <div
              key={img.src}
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
                width: CARD_W,
                aspectRatio: "1 / 1",
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
                transition: `transform 0.6s ${SMOOTH_EASE}, opacity 0.6s ${SMOOTH_EASE}, box-shadow 0.6s ${SMOOTH_EASE}`,
                willChange: "transform, opacity",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={encodeURI(img.src)}
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
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 12,
                  textAlign: "center",
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    background: "rgba(0,0,0,0.5)",
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                    padding: "5px 10px",
                    borderRadius: 999,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {imageLabel(img.src)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

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
              width: `${((activeIdx + 1) / IMAGES.length) * 100}%`,
              borderRadius: 999,
              background: "rgba(255,255,255,0.88)",
              transition: `width 0.4s ${SMOOTH_EASE}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
