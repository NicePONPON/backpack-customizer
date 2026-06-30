"use client";

import { useState } from "react";
import ProductCard from "@/components/salon/ProductCard";
import SALON_COPY from "@/app/salon/copy";
import { SALON_CATEGORIES, type SalonCategory, type SalonProduct, type SalonShop } from "@/lib/salon/types";

export default function SalonCatalogue({
  products,
  shopsByCategory,
}: {
  products: SalonProduct[];
  shopsByCategory: Record<SalonCategory, SalonShop[]>;
}) {
  const [active, setActive] = useState<SalonCategory>("hair");
  // shopsByCategory is consumed by the detail modal added in Task 6.
  void shopsByCategory;

  const visible = products.filter((p) => p.category === active);

  return (
    <div>
      <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {SALON_CATEGORIES.map((c) => {
          const on = c === active;
          return (
            <button
              key={c}
              onClick={() => setActive(c)}
              style={{
                fontSize: "var(--fs-sm)",
                letterSpacing: "var(--ls-caps)",
                textTransform: "uppercase",
                padding: "8px 16px",
                borderRadius: 999,
                cursor: "pointer",
                border: "1px solid color-mix(in srgb, var(--foreground) 20%, transparent)",
                background: on ? "var(--foreground)" : "transparent",
                color: on ? "var(--background)" : "inherit",
              }}
            >
              {SALON_COPY.categories[c]}
            </button>
          );
        })}
      </nav>

      {visible.length === 0 ? (
        <p style={{ fontSize: "var(--fs-md)", opacity: 0.6 }}>{SALON_COPY.emptyCategory}</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
