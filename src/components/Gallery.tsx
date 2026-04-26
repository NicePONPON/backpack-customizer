"use client";

import { useEffect, useRef, useState } from "react";

const IMAGES = [
  "/gallery/14-ivorydune-1.png",
  "/gallery/14-ivorydune-2.png",
  "/gallery/14-ivorydune-3.png",
  "/gallery/14-ivorydune-4.png",
  "/gallery/14-frostgrey-1.png",
  "/gallery/14-frostgrey-2.png",
  "/gallery/14-frostgrey-3.png",
  "/gallery/14-frostgrey-4.png",
];

const SMOOTH_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const CARD_W = "clamp(140px, 38vw, 220px)";

export default function Gallery() {
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
        {IMAGES.map((src, i) => {
          const active = i === activeIdx;
          return (
            <div
              key={src}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              style={{
                flex: "0 0 auto",
                width: CARD_W,
                aspectRatio: "1 / 1",
                scrollSnapAlign: "center",
                borderRadius: 24,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.14)",
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
                src={src}
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
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          marginTop: 14,
        }}
        aria-hidden
      >
        {IMAGES.map((_, i) => (
          <span
            key={i}
            style={{
              width: i === activeIdx ? 22 : 6,
              height: 6,
              borderRadius: 999,
              background:
                i === activeIdx
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.3)",
              transition: `width 0.4s ${SMOOTH_EASE}, background 0.4s ${SMOOTH_EASE}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
