"use client";

import { useEffect, useState } from "react";

const ICON_COLOR = "#666666";

function CaretIcon({ direction }: { direction: "up" | "down" }) {
  // Pure ^ or ∨ — no tail, just two diagonal strokes meeting at a point.
  const d = direction === "up"
    ? "M4 11 L8 5 L12 11"
    : "M4 5 L8 11 L12 5";
  return (
    <svg width={24} height={24} viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d={d} stroke={ICON_COLOR} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const btnStyle = (visible: boolean): React.CSSProperties => ({
  width: 36,
  height: 36,
  background: "transparent",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? "auto" : "none",
  transform: visible ? "scale(1)" : "scale(0.8)",
  transition: "opacity 0.22s ease, transform 0.22s ease",
  padding: 0,
});

export default function ScrollNav({ topOffset = 160 }: { topOffset?: number }) {
  const [showUp, setShowUp] = useState(false);
  const [showDown, setShowDown] = useState(false);

  useEffect(() => {
    const update = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setShowUp(scrolled > 120);
      setShowDown(maxScroll > 120 && scrolled < maxScroll - 60);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      {/* Up — top right */}
      <button
        aria-label="Scroll to top"
        style={{ ...btnStyle(showUp), position: "fixed", top: topOffset, right: 16, zIndex: 300 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <CaretIcon direction="up" />
      </button>

      {/* Down — bottom right */}
      <button
        aria-label="Scroll to bottom"
        style={{ ...btnStyle(showDown), position: "fixed", bottom: 24, right: 16, zIndex: 300 }}
        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
      >
        <CaretIcon direction="down" />
      </button>
    </>
  );
}
