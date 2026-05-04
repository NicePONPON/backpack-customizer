"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { computePricing, formatCurrency, VOLUME_TIERS, type CurrencyCode } from "@/lib/pricing";
import type { EmbroideryLineSize } from "@/components/EmbroideryControls";
import { readCurrencyCookie } from "@/lib/currencyPreference";

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
        background:
          "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 20,
        padding: "16px clamp(12px, 3vw, 20px) 18px",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      <div
        style={{
          color: "#fff",
          textAlign: "center",
          fontWeight: 700,
          fontSize: "clamp(10px, 2.5vw, 14px)",
          letterSpacing: "clamp(0.5px, 0.5vw, 2px)",
          textTransform: "uppercase",
          marginBottom: 12,
          opacity: 0.9,
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
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
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
                color: "rgba(255,255,255,0.55)",
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
                color: "#fff",
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
                color: "#a8e6a3",
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
          color: "rgba(255,255,255,0.4)",
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
