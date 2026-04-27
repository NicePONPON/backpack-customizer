"use client";

import { useEffect, useRef, useState } from "react";

export type GalleryImage = { src: string; sizeClass: "14" | "16" };

type GalleryItem =
  | { kind: "photo"; src: string; sizeClass: "14" | "16" }
  | {
      kind: "placeholder";
      silhouetteSrc: string;
      label: string;
      subLabel: string;
    };

type GalleryProps = {
  onActiveChange?: (img: GalleryImage | null) => void;
};

// Photos are pre-scaled in Photoshop — 14" files render visibly smaller than
// 16" files at native size, and saturation is already toned down at the
// source. No runtime size or saturation correction needed.
const ITEMS: GalleryItem[] = [
  { kind: "photo", src: "/gallery/14-ivorydune.png", sizeClass: "14" },
  { kind: "photo", src: "/gallery/14-frostgrey.png", sizeClass: "14" },
  { kind: "photo", src: "/gallery/16-ivorydune.png", sizeClass: "16" },
  { kind: "photo", src: "/gallery/16-frostgrey.png", sizeClass: "16" },
  {
    kind: "placeholder",
    // Reuse an existing render as the silhouette source so the placeholder
    // card matches the proportions of every other card in the row.
    silhouetteSrc: "/gallery/16-frostgrey.png",
    label: "Coming Soon",
    subLabel: "2026 Summer",
  },
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
    const item = ITEMS[activeIdx];
    onActiveChange?.(
      item.kind === "photo"
        ? { src: item.src, sizeClass: item.sizeClass }
        : null,
    );
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
        {ITEMS.map((item, i) => {
          const active = i === activeIdx;
          const cardKey =
            item.kind === "photo" ? item.src : `placeholder-${i}`;
          return (
            <div
              key={cardKey}
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
              {item.kind === "photo" ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={encodeURI(item.src)}
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
                      {imageLabel(item.src)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={encodeURI(item.silhouetteSrc)}
                    alt=""
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                      userSelect: "none",
                      // brightness(0) collapses every pixel to black while
                      // preserving alpha, so the bag silhouette becomes a
                      // clean shadow. The blur softens the edges so it reads
                      // as cast shadow rather than a black cutout.
                      filter: "brightness(0) blur(1.5px)",
                      opacity: 0.45,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      pointerEvents: "none",
                      textAlign: "center",
                      padding: "0 16px",
                    }}
                  >
                    <div
                      style={{
                        color: "rgba(255,255,255,0.95)",
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: 2.4,
                        textTransform: "uppercase",
                        textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: 1.6,
                        textTransform: "uppercase",
                        textShadow: "0 2px 10px rgba(0,0,0,0.6)",
                      }}
                    >
                      {item.subLabel}
                    </div>
                  </div>
                </>
              )}
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
              width: `${((activeIdx + 1) / ITEMS.length) * 100}%`,
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
