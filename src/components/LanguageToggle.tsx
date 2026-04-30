"use client";

import { useLocale, useTranslations } from "next-intl";

const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type Locale = "en" | "zh-TW";

export default function LanguageToggle() {
  const locale = useLocale() as Locale;
  const t = useTranslations("header");

  const setLocale = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    window.location.reload();
  };

  return (
    <div
      role="group"
      aria-label={t("languageToggleLabel")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 28,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.22)",
        background: "rgba(20,20,20,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: 2,
        gap: 2,
        userSelect: "none",
      }}
    >
      <Pill
        active={locale === "en"}
        onClick={() => setLocale("en")}
        label={t("languageEn")}
      />
      <Pill
        active={locale === "zh-TW"}
        onClick={() => setLocale("zh-TW")}
        label={t("languageZh")}
      />
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        height: 22,
        minWidth: 26,
        padding: "0 8px",
        borderRadius: 999,
        border: "none",
        background: active ? "rgba(255,255,255,0.95)" : "transparent",
        color: active ? "#111" : "rgba(255,255,255,0.78)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.6,
        cursor: active ? "default" : "pointer",
        transition: "background 200ms ease, color 200ms ease",
      }}
    >
      {label}
    </button>
  );
}
