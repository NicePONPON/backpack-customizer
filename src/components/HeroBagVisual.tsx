"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const HERO_SRC = "/texture/Hero.png";

// Five vertical bands, left → right.
//   "Ivory Dome"   → Ivory Dune (#FFF6DF) — closest brand-palette match
//   "Frosted Gray" → Frost Gray (#F3F6F5) — closest brand-palette match
//   Lavender Mist, Mint Dust, Rose Blush are exact palette hexes.
const BANDS: string[] = [
  "#FFF6DF", // Ivory Dome (Ivory Dune)
  "#F3F6F5", // Frosted Gray (Frost Gray)
  "#C2BAC7", // Lavender Mist
  "#BBD8C6", // Mint Dust
  "#E7CEC8", // Rose Blush
];

const SEGMENT_COUNT = BANDS.length;

// Tuning — kept conservative for a luxury, minimal feel.
const HORIZONTAL_GAP_PX = 28;       // step between adjacent separated segments
const VERTICAL_OFFSET_PX = 16;      // alternating up/down resting stagger
const MERGE_DURATION = 1.0;         // total per-segment merge animation
const STAGGER_STEP = 0.07;          // delay between segments (inside-out)
const ENTRY_DURATION = 0.7;
// Continuous floating loop while segments are separated. Per-segment phase
// offset (FLOAT_PHASE_STEP * i) keeps them out of unison for an organic,
// drifting feel rather than a robotic synchronized bob.
const FLOAT_AMPLITUDE_PX = 6;
const FLOAT_PERIOD_S = 4.2;
const FLOAT_PHASE_STEP = 0.45;
// cubic-bezier(0.4, 0, 0.2, 1) — material standard, no overshoot.
const SMOOTH_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Inside-out: center segment animates first (delay 0), outer pieces follow.
function delayForSegment(i: number): number {
  return Math.abs(i - 2) * STAGGER_STEP;
}

// Separated layout: equal horizontal spacing fanning out from center,
// alternating vertical offset (1, 3, 5 up; 2, 4 down — i.e. even indices up).
function separatedOffset(i: number): { x: number; y: number } {
  return {
    x: (i - 2) * HORIZONTAL_GAP_PX,
    y: i % 2 === 0 ? -VERTICAL_OFFSET_PX : VERTICAL_OFFSET_PX,
  };
}

function fitContain(cw: number, ch: number, iw: number, ih: number) {
  if (cw <= 0 || ch <= 0 || iw <= 0 || ih <= 0) {
    return { left: 0, top: 0, width: cw, height: ch };
  }
  const containerAspect = cw / ch;
  const imageAspect = iw / ih;
  if (containerAspect > imageAspect) {
    const height = ch;
    const width = ch * imageAspect;
    return { left: (cw - width) / 2, top: 0, width, height };
  }
  const width = cw;
  const height = cw / imageAspect;
  return { left: 0, top: (ch - height) / 2, width, height };
}

type BagBounds = { left: number; right: number };
type Intrinsic = { w: number; h: number };

export default function HeroBagVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [bagBounds, setBagBounds] = useState<BagBounds | null>(null);
  const [intrinsic, setIntrinsic] = useState<Intrinsic | null>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [merged, setMerged] = useState(false);
  const [supportsHover, setSupportsHover] = useState(true);

  // One-time alpha-channel scan: find leftmost and rightmost columns of
  // opaque pixels in Hero.png. That defines the bag's actual horizontal
  // extent so the 5 strips are sliced at equal widths within the bag,
  // not the (much wider) padded image canvas.
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const W = 300;
      const H = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * W));
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;
      const ALPHA_THRESHOLD = 16;
      let leftCol = W;
      let rightCol = -1;
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          const a = data[(y * W + x) * 4 + 3];
          if (a > ALPHA_THRESHOLD) {
            if (x < leftCol) leftCol = x;
            if (x > rightCol) rightCol = x;
            break;
          }
        }
      }
      if (rightCol < leftCol) return;
      setIntrinsic({ w: img.naturalWidth, h: img.naturalHeight });
      setBagBounds({ left: leftCol / W, right: (rightCol + 1) / W });
    };
    img.src = HERO_SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Hover-capable device → use hover. Touch-only → use tap toggle.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover)");
    const apply = () => setSupportsHover(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const scrollScale = useTransform(scrollYProgress, [0, 1], [1, 1.04]);

  const overlayRect = useMemo(() => {
    if (!containerSize || !intrinsic) return null;
    return fitContain(containerSize.w, containerSize.h, intrinsic.w, intrinsic.h);
  }, [containerSize, intrinsic]);

  const ready =
    bagBounds !== null && overlayRect !== null && containerSize !== null;

  const handleHoverStart = () => {
    if (supportsHover) setMerged(true);
  };
  const handleHoverEnd = () => {
    if (supportsHover) setMerged(false);
  };
  const handleTap = () => {
    if (!supportsHover) setMerged((m) => !m);
  };

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <motion.div
        style={{
          y,
          scale: scrollScale,
          width: "100%",
          height: "100%",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: ENTRY_DURATION, ease: SMOOTH_EASE }}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          onTap={handleTap}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: supportsHover ? "default" : "pointer",
            touchAction: "manipulation",
          }}
        >
          {ready &&
            BANDS.map((color, i) => {
              // Each segment is a full-size layer that renders the entire
              // Hero.png + a tint overlay, but is clip-pathed down to a
              // single vertical strip of the bag. Translating the segment
              // moves the strip while keeping its content aligned with the
              // photo's natural geometry.
              const cw = containerSize.w;
              const segLeftFrac =
                bagBounds.left +
                (i / SEGMENT_COUNT) * (bagBounds.right - bagBounds.left);
              const segRightFrac =
                bagBounds.left +
                ((i + 1) / SEGMENT_COUNT) *
                  (bagBounds.right - bagBounds.left);
              const clipLeftPx =
                overlayRect.left + segLeftFrac * overlayRect.width;
              const clipRightPx =
                overlayRect.left + segRightFrac * overlayRect.width;
              const insetLeftPx = Math.max(0, clipLeftPx);
              const insetRightPx = Math.max(0, cw - clipRightPx);
              const clipPath = `inset(0px ${insetRightPx}px 0px ${insetLeftPx}px)`;

              const offset = separatedOffset(i);
              const target = merged ? { x: 0, y: 0 } : offset;

              return (
                <motion.div
                  key={i}
                  initial={offset}
                  animate={target}
                  transition={{
                    duration: MERGE_DURATION,
                    ease: SMOOTH_EASE,
                    delay: delayForSegment(i),
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    willChange: "transform",
                  }}
                >
                  {/*
                    Inner layer handles the continuous floating loop. Nesting
                    keeps it independent of the outer merge transform, so the
                    two compose cleanly: outer = displacement, inner = idle
                    bob. When merged, the bob settles to 0 so the assembled
                    bag is perfectly still.
                  */}
                  <motion.div
                    animate={
                      merged
                        ? { y: 0 }
                        : { y: [0, -FLOAT_AMPLITUDE_PX, 0, FLOAT_AMPLITUDE_PX, 0] }
                    }
                    transition={
                      merged
                        ? { duration: 0.5, ease: SMOOTH_EASE }
                        : {
                            duration: FLOAT_PERIOD_S,
                            ease: "easeInOut",
                            repeat: Infinity,
                            delay: i * FLOAT_PHASE_STEP,
                          }
                    }
                    style={{
                      position: "absolute",
                      inset: 0,
                      clipPath,
                      WebkitClipPath: clipPath,
                      willChange: "transform",
                    }}
                  >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_SRC}
                    alt=""
                    aria-hidden
                    draggable={false}
                    fetchPriority={i === 2 ? "high" : "auto"}
                    decoding="async"
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      pointerEvents: "none",
                      display: "block",
                    }}
                  />
                  {/*
                    Color tint for this strip. Sized to the rendered image
                    rect, masked by Hero.png so it stays on the bag, and
                    multiplied so the photo's highlights/shadows tint the
                    color rather than flattening it.
                  */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: overlayRect.left,
                      top: overlayRect.top,
                      width: overlayRect.width,
                      height: overlayRect.height,
                      background: color,
                      mixBlendMode: "multiply",
                      pointerEvents: "none",
                      WebkitMaskImage: `url(${HERO_SRC})`,
                      maskImage: `url(${HERO_SRC})`,
                      WebkitMaskSize: "100% 100%",
                      maskSize: "100% 100%",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                    }}
                  />
                  </motion.div>
                </motion.div>
              );
            })}
        </motion.div>
      </motion.div>
    </div>
  );
}
