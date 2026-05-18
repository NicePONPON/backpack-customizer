"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { computePricing, formatCurrency, VOLUME_TIERS, type CurrencyCode } from "@/lib/pricing";
import type { EmbroideryLineSize } from "@/components/EmbroideryControls";
import { readCurrencyCookie } from "@/lib/currencyPreference";
import { useTheme } from "@/lib/ThemeContext";

const FIXED_QTYS = [200, 500, 1000] as const;

type Props = {
  size: "14" | "16";
  zipperUpgrade: boolean;
  embroideryLines: [string, string];
  embroideryLineCount: 1 | 2;
  embroideryLineSizes: [EmbroideryLineSize, EmbroideryLineSize];
};

export default function PriceDashboard({
  size,
  zipperUpgrade,
  embroideryLines,
  embroideryLineCount,
  embroideryLineSizes,
}: Props) {
  const t = useTranslations("priceDashboard");
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [currency, setCurrency] = useState<CurrencyCode>("SZL");

  useEffect(() => {
    setCurrency(readCurrencyCookie());
  }, []);

  const tiers = useMemo(
    () =>
      FIXED_QTYS.map((qty) => {
        const breakdown = computePricing({
          size,
          quantity: qty,
          zipperUpgrade,
          embroideryLines,
          embroideryLineCount,
          embroideryLineSizes,
          currency,
        });
        const perUnit = breakdown.netInclSZL / qty;
        const discountPct =
          VOLUME_TIERS.find((v) => qty >= v.minQty)?.discount ?? 0;
        return { qty, perUnit, discountPct };
      }),
    [size, zipperUpgrade, embroideryLines, embroideryLineCount, embroideryLineSizes, currency]
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        background: isDark
          ? "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)"
          : "rgba(255,255,255,0.65)",
        border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.85)",
        borderRadius: 20,
        padding: "16px clamp(12px, 3vw, 20px) 18px",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)"
          : "0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
        transition: "background 0.5s ease, border-color 0.5s ease",
      }}
    >
      <div
        style={{
          color: isDark ? "#fff" : "#222222",
          textAlign: "center",
          fontWeight: 700,
          fontSize: "clamp(10px, 2.5vw, 14px)",
          letterSpacing: "clamp(0.5px, 0.5vw, 2px)",
          textTransform: "uppercase",
          marginBottom: 12,
          opacity: 0.9,
          transition: "color 0.5s ease",
        }}
      >
        {t("title")}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "clamp(6px, 1.5vw, 10px)",
        }}
      >
        {tiers.map(({ qty, perUnit, discountPct }) => (
          <div
            key={qty}
            style={{
              background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.04)",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              padding: "clamp(8px, 2vw, 14px) clamp(4px, 1vw, 10px) clamp(10px, 2.5vw, 16px)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
                fontSize: "clamp(9px, 2vw, 11px)",
                fontWeight: 600,
                letterSpacing: "clamp(0px, 0.3vw, 1.2px)",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t("qty", { qty })}
            </div>
            <div
              style={{
                color: isDark ? "#fff" : "#222222",
                fontSize: "clamp(13px, 3.8vw, 22px)",
                fontWeight: 700,
                letterSpacing: -0.5,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {formatCurrency(perUnit, currency)}
            </div>
            <div
              style={{
                color: isDark ? "#a8e6a3" : "#2d7a2d",
                fontSize: "clamp(9px, 2vw, 11px)",
                fontWeight: 600,
                letterSpacing: "clamp(0px, 0.2vw, 0.5px)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {discountPct > 0
                ? t("discount", { pct: Math.round(discountPct * 100) })
                : t("noDiscount")}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
          fontSize: "clamp(9px, 2vw, 11px)",
          textAlign: "center",
          marginTop: 10,
          letterSpacing: 0.3,
        }}
      >
        {t("taxNote")}
      </div>
    </div>
  );
}
