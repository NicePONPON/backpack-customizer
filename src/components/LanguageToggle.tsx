"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale } from "next-intl";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type Locale = "en" | "zh-TW" | "ja" | "vi" | "en-AU";

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: "zh-TW", label: "繁中" },
  { code: "en",    label: "EN" },
  { code: "ja",    label: "日本語" },
  { code: "vi",    label: "Viet" },
  { code: "en-AU", label: "AU" },
];

export default function LanguageToggle() {
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[1];

  const setLocale = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    window.location.reload();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger pill */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 28,
          padding: "0 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(20,20,20,0.45)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "rgba(255,255,255,0.9)",
          fontSize: "var(--fs-sm)",
          letterSpacing: "var(--ls-normal)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {current.label}
        <svg
          width="8"
          height="5"
          viewBox="0 0 8 5"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 200ms ease",
            flexShrink: 0,
          }}
        >
          <path
            d="M1 1l3 3 3-3"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 100,
            background: "rgba(18,18,18,0.94)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 12,
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            zIndex: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === locale}
              onClick={() => setLocale(lang.code)}
              style={{
                padding: "7px 14px",
                borderRadius: 8,
                border: "none",
                background:
                  lang.code === locale ? "rgba(255,255,255,0.14)" : "transparent",
                color:
                  lang.code === locale
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.6)",
                fontSize: "var(--fs-sm)",
                letterSpacing: "var(--ls-normal)",
                textAlign: "left",
                cursor: lang.code === locale ? "default" : "pointer",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
