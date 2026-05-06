"use client";

import { useEffect, useRef, useState } from "react";
import { CURRENCIES, type CurrencyCode } from "@/lib/pricing";
import { countryForCurrency, flagSrc } from "@/lib/countries";
import {
  readCurrencyCookie,
  writeCurrencyCookie,
} from "@/lib/currencyPreference";

const CURRENCY_CODES: CurrencyCode[] = ["SZL", "ZAR", "USD", "TWD"];

function FlagCircle({ code, size = 20 }: { code: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#333",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagSrc(code)}
        alt={code}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </span>
  );
}

export default function CurrencySelector({ invert = false }: { invert?: boolean }) {
  const [currency, setCurrency] = useState<CurrencyCode>("SZL");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrency(readCurrencyCookie());
  }, []);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const select = (code: CurrencyCode) => {
    if (code === currency) { setOpen(false); return; }
    writeCurrencyCookie(code);
    window.location.reload();
  };

  const country = countryForCurrency(currency);

  const pillBorder = invert
    ? "1px solid rgba(0,0,0,0.18)"
    : "1px solid rgba(255,255,255,0.22)";
  const pillBg = invert ? "rgba(255,255,255,0.55)" : "rgba(20,20,20,0.45)";
  const textColor = invert ? "#111" : "rgba(255,255,255,0.9)";

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          height: 28,
          borderRadius: 999,
          border: pillBorder,
          background: pillBg,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          padding: "0 10px 0 6px",
          cursor: "pointer",
          color: textColor,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          userSelect: "none",
        }}
      >
        <FlagCircle code={country.code} size={16} />
        {currency}
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 180,
            background: "rgba(24,24,24,0.96)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            overflow: "hidden",
            zIndex: 200,
          }}
        >
          {CURRENCY_CODES.map((code) => {
            const c = countryForCurrency(code);
            const meta = CURRENCIES[code];
            const active = code === currency;
            return (
              <button
                key={code}
                role="option"
                aria-selected={active}
                type="button"
                onClick={() => select(code)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "9px 14px",
                  border: "none",
                  background: active ? "rgba(255,255,255,0.1)" : "transparent",
                  cursor: active ? "default" : "pointer",
                  textAlign: "left",
                }}
              >
                <FlagCircle code={c.code} size={22} />
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: active ? 700 : 500,
                      letterSpacing: 0.3,
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: 10,
                      letterSpacing: 0.4,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                {active && (
                  <span
                    style={{
                      marginLeft: "auto",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#a8e6a3",
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
