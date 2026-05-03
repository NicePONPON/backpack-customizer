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
        padding: "18px 20px 20px",
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
          fontSize: 14,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 14,
          opacity: 0.9,
        }}
      >
        {t("title")}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {tiers.map(({ qty, perUnit, discountPct }) => (
          <div
            key={qty}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "14px 10px 16px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {t("qty", { qty })}
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: -0.5,
                lineHeight: 1.15,
              }}
            >
              {formatCurrency(perUnit, currency)}
            </div>
            <div
              style={{
                color: "#a8e6a3",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
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
          fontSize: 11,
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
