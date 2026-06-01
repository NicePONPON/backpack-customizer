"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

function useIsWide(breakpoint = 560) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const check = () => setWide(window.innerWidth >= breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return wide;
}

const TITLE_SIZE_WIDE = 38;
const TITLE_SIZE_NARROW = 28;
const BODY_SIZE = 16;
const PARA_COUNT = 8;

// Exponential decay: center paragraph = 0.92, fades symmetrically outward.
// SCALE (px) controls how fast it fades — lower = steeper.
const OPACITY_MAX = 0.92;
const OPACITY_MIN = 0.22;
const SCALE = 160;

function distToOpacity(dist: number) {
  return OPACITY_MIN + (OPACITY_MAX - OPACITY_MIN) * Math.exp(-dist / SCALE);
}

function toRgba(isDark: boolean, alpha: number) {
  return isDark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
}

export default function BrandStory() {
  const t = useTranslations("home.brandStory");
  const wide = useIsWide();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [opacities, setOpacities] = useState<number[]>(
    Array(PARA_COUNT).fill(OPACITY_MIN)
  );

  useEffect(() => {
    const onScroll = () => {
      const vpCenter = window.innerHeight / 2;
      const next = paraRefs.current.map((el) => {
        if (!el) return OPACITY_MIN;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - vpCenter);
        return distToOpacity(dist);
      });
      setOpacities(next);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const setRef = (i: number) => (el: HTMLParagraphElement | null) => {
    paraRefs.current[i] = el;
  };

  const bodyStyle = (i: number, extra?: React.CSSProperties): React.CSSProperties => ({
    margin: 0,
    fontSize: BODY_SIZE,
    lineHeight: 1.85,
    color: toRgba(isDark, opacities[i] ?? OPACITY_MIN),
    transition: "color 0.4s ease",
    ...extra,
  });

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 640,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 56,
        padding: "8px 0",
        textAlign: "center",
      }}
    >
      {/* ── Beat 1: Headline — always fully visible ───────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{
          margin: 0, fontSize: "var(--fs-sm)", fontWeight: 600,
          letterSpacing: 3, textTransform: "uppercase",
          color: toRgba(isDark, 0.38),
          transition: "color 0.5s ease",
        }}>
          {t("act1.label")}
        </p>

        <h2 style={{
          margin: 0,
          fontSize: wide ? TITLE_SIZE_WIDE : TITLE_SIZE_NARROW,
          fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5,
          paddingBottom: "0.1em",
          ...(isDark
            ? {
                background: "linear-gradient(180deg, #ffffff 0%, #aaaaaa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }
            : { color: "#111", WebkitTextFillColor: "#111" }),
        }}>
          {t("act1.headline")}
        </h2>

        <p style={{
          margin: 0, fontSize: BODY_SIZE,
          color: toRgba(isDark, 0.55), letterSpacing: 0.3,
          transition: "color 0.5s ease",
        }}>
          {t("act1.sub")}
        </p>
      </div>

      {/* ── Beat 2: Scroll-highlighted paragraphs ────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <p ref={setRef(0)} style={bodyStyle(0, { whiteSpace: "pre-line" })}>
          {t("act2.problem")}
        </p>

        <p ref={setRef(1)} style={bodyStyle(1, { fontWeight: 700, letterSpacing: -0.2 })}>
          {t("act2.bridge")}
        </p>

        <p ref={setRef(2)} style={bodyStyle(2)}>
          {t("act2.resolution")}
        </p>

        <p ref={setRef(3)} style={bodyStyle(3, { fontWeight: 500, letterSpacing: 0.3 })}>
          {t("pillars.one")}{"  ·  "}{t("pillars.two")}{"  ·  "}{t("pillars.three")}
        </p>

        <p ref={setRef(4)} style={bodyStyle(4)}>
          {t("closing.p1")}
        </p>

        <p ref={setRef(5)} style={bodyStyle(5)}>
          {t("closing.p2")}
        </p>

        <p ref={setRef(6)} style={bodyStyle(6)}>
          {t("closing.p3")}
        </p>

        <p
          ref={setRef(7)}
          style={{
            margin: "8px 0 0", fontSize: "var(--fs-sm)", fontWeight: 600,
            letterSpacing: 3.5, textTransform: "uppercase",
            color: toRgba(isDark, (opacities[7] ?? OPACITY_MIN) * 0.55),
            transition: "color 0.4s ease",
          }}
        >
          {t("closing.origin")}
        </p>
      </div>
    </section>
  );
}
