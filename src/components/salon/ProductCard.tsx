"use client";

import Image from "next/image";
import { photoPublicUrl } from "@/lib/salon/storage";
import { formatPrice } from "@/lib/salon/format";
import type { SalonProduct } from "@/lib/salon/types";

export default function ProductCard({
  product,
  onOpen,
}: {
  product: SalonProduct;
  onOpen: (p: SalonProduct) => void;
}) {
  const cover = product.photos[0];
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      style={{
        textAlign: "left",
        border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
        borderRadius: 12,
        overflow: "hidden",
        background: "transparent",
        cursor: "pointer",
        padding: 0,
        color: "inherit",
      }}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", background: "color-mix(in srgb, var(--foreground) 6%, transparent)" }}>
        {cover ? (
          <Image
            src={photoPublicUrl(cover)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 280px"
            style={{ objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)" }}>{product.name}</div>
        <div style={{ fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-normal)", opacity: 0.7, marginTop: 4 }}>
          {formatPrice(product.price, product.currency)}
        </div>
      </div>
    </button>
  );
}
