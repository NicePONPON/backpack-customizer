"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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

const cardBase: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 20,
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
  overflow: "hidden",
};

export default function FeatureExpandableCard({
  data,
}: {
  data: FeatureCardData;
}) {
  const [expanded, setExpanded] = useState(false);

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
              color: "#fff",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {data.summary}
          </div>
        </div>
        <Arrow expanded={expanded} />
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
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderTop: "1px solid rgba(255,255,255,0.14)",
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
                <FeatureRow
                  key={item.videoSrc}
                  item={item}
                  active={expanded}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Arrow({ expanded }: { expanded: boolean }) {
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
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
      aria-hidden
    >
      <svg width="10" height="12" viewBox="0 0 10 12">
        <path d="M1 1 L9 6 L1 11 Z" fill="rgba(255,255,255,0.55)" />
      </svg>
    </motion.div>
  );
}

function FeatureRow({
  item,
  active,
  index,
}: {
  item: FeatureItem;
  active: boolean;
  index: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* some browsers throw if metadata isn't loaded yet */
      }
    }
  }, [active]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: SMOOTH_EASE,
        delay: 0.05 + index * 0.06,
      }}
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
          boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
          background: "#000",
          display: "block",
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 0.2,
            marginBottom: 6,
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {item.description}
        </div>
      </div>
    </motion.div>
  );
}
