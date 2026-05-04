"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// ─── scroll-reveal hook ─────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
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

function FadeUp({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const [ref, inView] = useInView();
  return (
    <div
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── component ──────────────────────────────────────────────────────────────

export default function BrandStory() {
  const t = useTranslations("home.brandStory");

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 720,
        display: "flex",
        flexDirection: "column",
        gap: 72,
        padding: "16px 0 8px",
      }}
    >
      {/* ── ACT 1: Opening manifesto ────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
        <FadeUp delay={0}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {t("act1.label")}
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h2
            style={{
              margin: 0,
              fontSize: "clamp(32px, 7vw, 54px)",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1,
              background: "linear-gradient(180deg, #ffffff 0%, #aaaaaa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {t("act1.headline")}
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 400,
              letterSpacing: 0.3,
              color: "rgba(255,255,255,0.58)",
            }}
          >
            {t("act1.sub")}
          </p>
        </FadeUp>
      </div>

      {/* ── ACT 2: Problem → resolution ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 32,
          alignItems: "flex-start",
        }}
      >
        {/* Problem column */}
        <FadeUp
          delay={0}
          style={{
            flex: "1 1 240px",
            paddingLeft: 20,
            borderLeft: "2px solid rgba(255,255,255,0.12)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.85,
              color: "rgba(255,255,255,0.45)",
              whiteSpace: "pre-line",
            }}
          >
            {t("act2.problem")}
          </p>
        </FadeUp>

        {/* Pull-quote column */}
        <FadeUp delay={0.15} style={{ flex: "1 1 220px" }}>
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.25) 0%, transparent 100%)",
              marginBottom: 18,
            }}
          />
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "clamp(20px, 4vw, 27px)",
              fontWeight: 700,
              lineHeight: 1.25,
              color: "rgba(255,255,255,0.95)",
              letterSpacing: -0.3,
            }}
          >
            {t("act2.bridge")}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.6)",
            }}
          >
            {t("act2.resolution")}
          </p>
        </FadeUp>
      </div>

      {/* ── ACT 3: Three pillars ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "clamp(8px, 2vw, 16px)",
        }}
      >
        {(["one", "two", "three"] as const).map((key, i) => (
          <FadeUp key={key} delay={i * 0.12}>
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: "clamp(16px, 3vw, 24px) clamp(12px, 2vw, 20px)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "clamp(14px, 3vw, 18px)",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.88)",
                  letterSpacing: 0.2,
                  lineHeight: 1.3,
                }}
              >
                {t(`pillars.${key}`)}
              </p>
            </div>
          </FadeUp>
        ))}
      </div>

      {/* ── Closing ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          textAlign: "center",
          maxWidth: 560,
          alignSelf: "center",
        }}
      >
        <FadeUp delay={0}>
          <p
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: 0.2,
              lineHeight: 1.5,
            }}
          >
            {t("closing.p1")}
          </p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.8,
              letterSpacing: 0.2,
            }}
          >
            {t("closing.p2")}
          </p>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontStyle: "italic",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.7,
            }}
          >
            {t("closing.p3")}
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          {/* dot divider */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              margin: "8px 0",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  display: "block",
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.28)",
            }}
          >
            {t("closing.origin")}
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
