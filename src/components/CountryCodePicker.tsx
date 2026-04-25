"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, findCountry, flagSrc } from "@/lib/countries";

type Props = {
  value: string;
  onChange: (code: string) => void;
};

export default function CountryCodePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = findCountry(value) ?? COUNTRIES[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(255,255,255,0.06)",
          color: "#fff",
          fontSize: 14,
          cursor: "pointer",
          height: 38,
          boxSizing: "border-box",
        }}
      >
        <FlagDot code={selected.code} size={20} />
        <span>{selected.dialCode}</span>
        <span style={{ opacity: 0.7, fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 10,
            minWidth: 240,
            background: "#1b1b1b",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 10,
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            overflow: "hidden",
          }}
        >
          {COUNTRIES.map((c) => (
            <button
              type="button"
              key={c.code}
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                background:
                  c.code === selected.code
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                border: "none",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <FlagDot code={c.code} size={20} />
              <span style={{ flex: 1 }}>{c.name}</span>
              <span style={{ opacity: 0.75 }}>{c.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FlagDot({ code, size }: { code: string; size: number }) {
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
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </span>
  );
}
