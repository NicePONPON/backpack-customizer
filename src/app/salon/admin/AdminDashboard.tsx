"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import SALON_COPY from "@/app/salon/copy";
import type { SalonProduct, SalonShop } from "@/lib/salon/types";

export default function AdminDashboard({
  adminEmail,
  products,
  shops,
}: {
  adminEmail: string;
  products: SalonProduct[];
  shops: SalonShop[];
}) {
  const router = useRouter();
  // products/shops are rendered by Tasks 8-9.
  void products;
  void shops;

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/salon/login");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{SALON_COPY.admin.title}</h1>
        <button
          onClick={signOut}
          style={{ fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", background: "transparent", border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", borderRadius: 999, padding: "8px 14px", cursor: "pointer", color: "inherit" }}
        >
          {SALON_COPY.admin.signOut}
        </button>
      </div>
      <p style={{ fontSize: "var(--fs-sm)", opacity: 0.6, marginTop: 4 }}>{adminEmail}</p>
    </div>
  );
}
