"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/lib/ThemeContext";

export type FeatureItem = {
  videoSrc: string;
  title: string;
  description: string;
};

export type FeatureCardData = {
  title: string;
  summary: string;
  items: FeatureItem[];
};

const SMOOTH_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export default function FeatureExpandableCard({ data }: { data: FeatureCardData }) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const cardBase: React.CSSProperties = {
    background: isDark
      ? "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)"
      : "linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%)",
    border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(0,0,0,0.1)",
    borderRadius: 20,
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    boxShadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)"
      : "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
    overflow: "hidden",
    transition: "background 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease",
  };

  return (
    <div style={cardBase}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          width: "100%",
          padding: "20px 22px 22px",
          background: "transparent",
          border: 0,
          color: "inherit",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1.5,
              color: isDark ? "#fff" : "#111",
              textTransform: "uppercase",
              marginBottom: 8,
              transition: "color 0.5s ease",
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              fontSize: 14,
              lineHeight: 1.55,
              transition: "color 0.5s ease",
            }}
          >
            {data.summary}
          </div>
        </div>
        <Arrow expanded={expanded} isDark={isDark} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: SMOOTH_EASE }}
            style={{
              overflow: "hidden",
              background: isDark
                ? "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)"
                : "linear-gradient(135deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderTop: isDark
                ? "1px solid rgba(255,255,255,0.14)"
                : "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                padding: "18px 22px 22px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {data.items.map((item, i) => (
                <FeatureRow key={item.videoSrc} item={item} active={expanded} index={i} isDark={isDark} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Arrow({ expanded, isDark }: { expanded: boolean; isDark: boolean }) {
  return (
    <motion.div
      animate={{ rotate: expanded ? 90 : 0 }}
      transition={{ duration: 0.3, ease: SMOOTH_EASE }}
      style={{
        width: 28,
        height: 28,
        flexShrink: 0,
        marginTop: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)",
      }}
      aria-hidden
    >
      <svg width="10" height="12" viewBox="0 0 10 12">
        <path d="M1 1 L9 6 L1 11 Z" fill={isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)"} />
      </svg>
    </motion.div>
  );
}

function FeatureRow({
  item,
  active,
  index,
  isDark,
}: {
  item: FeatureItem;
  active: boolean;
  index: number;
  isDark: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
      try { v.currentTime = 0; } catch { /* metadata not loaded */ }
    }
  }, [active]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: SMOOTH_EASE, delay: 0.05 + index * 0.06 }}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(96px, 120px) 1fr",
        gap: 14,
        alignItems: "center",
      }}
    >
      <video
        ref={videoRef}
        src={encodeURI(item.videoSrc)}
        loop
        muted
        playsInline
        preload="metadata"
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          objectFit: "cover",
          borderRadius: 12,
          boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
          background: "#000",
          display: "block",
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isDark ? "#fff" : "#111",
            letterSpacing: 0.2,
            marginBottom: 6,
            transition: "color 0.5s ease",
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.6)",
            transition: "color 0.5s ease",
          }}
        >
          {item.description}
        </div>
      </div>
    </motion.div>
  );
}
