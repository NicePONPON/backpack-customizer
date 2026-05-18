"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  const rotate = direction === "up" ? "-90deg" : "90deg";
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0, transform: `rotate(${rotate})` }}
    >
      <path
        d="M2.5 8h11M9 3.5L13.5 8 9 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ScrollNav({ bottomOffset = 24 }: { bottomOffset?: number }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
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

  const btnStyle = (visible: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 999,
    background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
    border: isDark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.1)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: isDark ? "#fff" : "#222",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transform: visible ? "scale(1)" : "scale(0.85)",
    transition: "opacity 0.22s ease, transform 0.22s ease",
  });

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: bottomOffset,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 300,
      }}
    >
      <button
        aria-label="Scroll to top"
        style={btnStyle(showUp)}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <ChevronIcon direction="up" />
      </button>
      <button
        aria-label="Scroll to bottom"
        style={btnStyle(showDown)}
        onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
      >
        <ChevronIcon direction="down" />
      </button>
    </div>
  );
}
