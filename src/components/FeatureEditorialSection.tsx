"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

type FeatureItem = {
  videoSrc: string;
  title: string;
  description: string;
};

type FeaturePillar = {
  pillar: string;
  items: FeatureItem[];
};

type Props = {
  pillars: FeaturePillar[];
};

function EditorialBlock({
  item,
  pillar,
  reverse,
  isDark,
}: {
  item: FeatureItem;
  pillar: string;
  reverse: boolean;
  isDark: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setRevealed(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const textColor = isDark ? "rgba(255,255,255,0.85)" : "#333";
  const eyebrowColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const descColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: reverse ? "row-reverse" : "row",
        width: "100%",
        minHeight: 280,
        borderBottom: `1px solid ${dividerColor}`,
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.9s ease, transform 0.9s cubic-bezier(0.2,0,0,1)",
      }}
    >
      {/* Video side */}
      <div
        style={{
          flex: "0 0 50%",
          overflow: "hidden",
          background: isDark ? "#1a1a1e" : "#f0ede8",
          position: "relative",
        }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        >
          <source src={item.videoSrc} type="video/mp4" />
        </video>
      </div>

      {/* Text side */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 40px",
          gap: 16,
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: eyebrowColor,
            margin: 0,
            transition: "color 0.5s ease",
          }}
        >
          {pillar}
        </p>
        <h3
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: -0.8,
            color: textColor,
            margin: 0,
            lineHeight: 1.15,
            transition: "color 0.5s ease",
          }}
        >
          {item.title}
        </h3>
        <p
          style={{
            fontSize: 15,
            color: descColor,
            lineHeight: 1.75,
            margin: 0,
            maxWidth: 320,
            transition: "color 0.5s ease",
          }}
        >
          {item.description}
        </p>
      </div>
    </div>
  );
}

export default function FeatureEditorialSection({ pillars }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const blocks: { item: FeatureItem; pillar: string; index: number }[] = [];
  pillars.forEach((p) => {
    p.items.forEach((item) => {
      blocks.push({ item, pillar: p.pillar, index: blocks.length });
    });
  });

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      {blocks.map(({ item, pillar, index }) => (
        <EditorialBlock
          key={item.title}
          item={item}
          pillar={pillar}
          reverse={index % 2 !== 0}
          isDark={isDark}
        />
      ))}
    </div>
  );
}
