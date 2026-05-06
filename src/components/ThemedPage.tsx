"use client";

import { useTheme } from "@/lib/ThemeContext";

export default function ThemedPage({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <main
      style={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(#555555, #222222)"
          : "linear-gradient(#f0f0f0, #e8e8e8)",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 24px 48px",
        gap: 48,
        color: isDark ? "#fff" : "#111",
        transition: "background 0.5s ease, color 0.5s ease",
      }}
    >
      {children}
    </main>
  );
}
