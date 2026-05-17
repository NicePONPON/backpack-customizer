"use client";

import { createContext, useContext, useState } from "react";

type Theme = "dark" | "light";

const COOKIE = "SITE_THEME";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readThemeCookie(): Theme {
  if (typeof document === "undefined") return "light";
  const match = document.cookie.match(/(?:^|;\s*)SITE_THEME=([^;]+)/);
  return match?.[1] === "dark" ? "dark" : "light";
}

function saveThemeCookie(theme: Theme) {
  document.cookie = `${COOKIE}=${theme}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children, initialTheme }: { children: React.ReactNode; initialTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? readThemeCookie);
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      saveThemeCookie(next);
      return next;
    });
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
