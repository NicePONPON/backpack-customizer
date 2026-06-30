"use client";

import Image from "next/image";
import { photoPublicUrl } from "@/lib/salon/storage";
import { formatPrice } from "@/lib/salon/format";
import SALON_COPY from "@/app/salon/copy";
import WhereToBuy from "@/components/salon/WhereToBuy";
import type { SalonProduct, SalonShop } from "@/lib/salon/types";

export default function ProductDetailModal({
  product,
  shops,
  onClose,
}: {
  product: SalonProduct;
  shops: SalonShop[];
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--background)", color: "var(--foreground)", borderRadius: 16, maxWidth: 760, width: "100%", padding: 24, marginTop: 40 }}
      >
        <button
          onClick={onClose}
          style={{ float: "right", fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
        >
          {SALON_COPY.detailClose}
        </button>

        <h2 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{product.name}</h2>
        <div style={{ fontSize: "var(--fs-md)", opacity: 0.8, marginTop: 4 }}>
          {formatPrice(product.price, product.currency)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
          {product.photos.map((path) => (
            <div key={path} style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", borderRadius: 8, overflow: "hidden", background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}>
              <Image src={photoPublicUrl(path)} alt={product.name} fill sizes="200px" style={{ objectFit: "cover" }} />
            </div>
          ))}
        </div>

        {product.description ? (
          <p style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)", marginTop: 16, whiteSpace: "pre-wrap" }}>
            {product.description}
          </p>
        ) : null}

        <WhereToBuy shops={shops} />
      </div>
    </div>
  );
}
