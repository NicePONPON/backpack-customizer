"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

export default function BrandStory() {
  const t = useTranslations("home.brandStory");
  const [ref1, inView1] = useInView();
  const [ref2, inView2] = useInView();

  const fadeStyle = (inView: boolean, delay = 0): React.CSSProperties => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
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
      {/* ── Beat 1: Headline ─────────────────────────────────────────── */}
      <div
        ref={ref1}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <p style={{ ...fadeStyle(inView1, 0), margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.38)" }}>
          {t("act1.label")}
        </p>
        <h2 style={{ ...fadeStyle(inView1, 0.1), margin: 0, fontSize: "clamp(30px, 7vw, 52px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5, paddingBottom: "0.1em", background: "linear-gradient(180deg, #ffffff 0%, #aaaaaa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {t("act1.headline")}
        </h2>
        <p style={{ ...fadeStyle(inView1, 0.2), margin: 0, fontSize: 16, color: "rgba(255,255,255,0.5)", letterSpacing: 0.3 }}>
          {t("act1.sub")}
        </p>
      </div>

      {/* ── Beat 2: Essay ────────────────────────────────────────────── */}
      <div
        ref={ref2}
        style={{ ...fadeStyle(inView2, 0), display: "flex", flexDirection: "column", gap: 20 }}
      >
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.9, color: "rgba(255,255,255,0.42)", whiteSpace: "pre-line" }}>
          {t("act2.problem")}
        </p>

        <p style={{ margin: 0, fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 600, lineHeight: 1.3, color: "rgba(255,255,255,0.92)", letterSpacing: -0.2 }}>
          {t("act2.bridge")}
        </p>

        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.58)" }}>
          {t("act2.resolution")}
        </p>

        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.75)", letterSpacing: 0.3, lineHeight: 1.6 }}>
          {t("pillars.one")}{"  ·  "}{t("pillars.two")}{"  ·  "}{t("pillars.three")}
        </p>

        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.55)" }}>
          {t("closing.p1")}
        </p>

        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.85, color: "rgba(255,255,255,0.4)" }}>
          {t("closing.p2")}
        </p>

        <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.38)", lineHeight: 1.8 }}>
          {t("closing.p3")}
        </p>

        <p style={{ margin: "8px 0 0", fontSize: 10, fontWeight: 600, letterSpacing: 3.5, textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>
          {t("closing.origin")}
        </p>
      </div>
    </section>
  );
}
