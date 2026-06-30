import SALON_COPY from "@/app/salon/copy";
import type { SalonShop } from "@/lib/salon/types";

const linkStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: "var(--fs-sm)",
  letterSpacing: "var(--ls-caps)",
  textTransform: "uppercase",
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)",
  textDecoration: "none",
  color: "inherit",
  marginRight: 8,
  marginTop: 8,
};

export default function WhereToBuy({ shops }: { shops: SalonShop[] }) {
  if (shops.length === 0) return null;
  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)", fontWeight: 600 }}>
        {SALON_COPY.whereToBuyTitle}
      </h3>
      {shops.map((s) => (
        <div key={s.id} style={{ marginTop: 12 }}>
          <div style={{ fontSize: "var(--fs-md)", letterSpacing: "var(--ls-normal)" }}>{s.shop_name}</div>
          {s.map_address ? (
            <div style={{ fontSize: "var(--fs-sm)", opacity: 0.7, marginTop: 2 }}>{s.map_address}</div>
          ) : null}
          <div>
            {s.online_url ? (
              <a href={s.online_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {SALON_COPY.visitShop}
              </a>
            ) : null}
            {s.google_maps_url ? (
              <a href={s.google_maps_url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {SALON_COPY.openInMaps}
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </section>
  );
}
