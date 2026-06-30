"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PhotoUploader from "@/components/salon/PhotoUploader";
import { formatPrice } from "@/lib/salon/format";
import SALON_COPY from "@/app/salon/copy";
import { SALON_CATEGORIES, type SalonCategory, type SalonProduct, type SalonShop } from "@/lib/salon/types";

type Draft = {
  id: string | null;
  category: SalonCategory;
  name: string;
  description: string;
  price: string;
  currency: string;
  photos: string[];
  is_published: boolean;
};

const emptyDraft = (): Draft => ({
  id: null,
  category: "hair",
  name: "",
  description: "",
  price: "",
  currency: "SZL",
  photos: [],
  is_published: false,
});

type ShopDraft = {
  id: string | null;
  category: SalonCategory;
  shop_name: string;
  online_url: string;
  map_address: string;
  google_maps_url: string;
};

const emptyShopDraft = (): ShopDraft => ({
  id: null, category: "hair", shop_name: "", online_url: "", map_address: "", google_maps_url: "",
});

// Client-side id used for namespacing uploads of brand-new products before insert.
function tempId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `tmp-${Date.now()}`);
}

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
  const supabase = createClient();
  const [shopDraft, setShopDraft] = useState<ShopDraft | null>(null);
  const [shopError, setShopError] = useState("");
  const [shopSaving, setShopSaving] = useState(false);

  const startAddShop = () => { setShopDraft(emptyShopDraft()); setShopError(""); };
  const startEditShop = (s: SalonShop) => {
    setShopDraft({
      id: s.id, category: s.category, shop_name: s.shop_name,
      online_url: s.online_url ?? "", map_address: s.map_address ?? "", google_maps_url: s.google_maps_url ?? "",
    });
    setShopError("");
  };

  const saveShop = async () => {
    if (!shopDraft) return;
    if (!shopDraft.shop_name.trim()) return setShopError("Shop name is required.");
    setShopSaving(true);
    setShopError("");
    const row = {
      category: shopDraft.category,
      shop_name: shopDraft.shop_name.trim(),
      online_url: shopDraft.online_url.trim() || null,
      map_address: shopDraft.map_address.trim() || null,
      google_maps_url: shopDraft.google_maps_url.trim() || null,
    };
    const res = shopDraft.id
      ? await supabase.from("salon_shops").update(row).eq("id", shopDraft.id)
      : await supabase.from("salon_shops").insert(row);
    setShopSaving(false);
    if (res.error) return setShopError(res.error.message);
    setShopDraft(null);
    router.refresh();
  };

  const removeShop = async (s: SalonShop) => {
    if (!confirm(`Delete "${s.shop_name}"?`)) return;
    const { error } = await supabase.from("salon_shops").delete().eq("id", s.id);
    if (error) setShopError(error.message);
    else router.refresh();
  };
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftId, setDraftId] = useState<string>(tempId());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/salon/login");
  };

  const startAdd = () => {
    setDraft(emptyDraft());
    setDraftId(tempId());
    setError("");
  };

  const startEdit = (p: SalonProduct) => {
    setDraft({
      id: p.id,
      category: p.category,
      name: p.name,
      description: p.description,
      price: String(p.price),
      currency: p.currency,
      photos: p.photos,
      is_published: p.is_published,
    });
    setDraftId(p.id);
    setError("");
  };

  const save = async () => {
    if (!draft) return;
    const priceNum = Number(draft.price);
    if (!draft.name.trim()) return setError("Name is required.");
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError("Price must be 0 or more.");
    if (draft.photos.length === 0) return setError("At least one photo is required.");

    setSaving(true);
    setError("");
    const row = {
      category: draft.category,
      name: draft.name.trim(),
      description: draft.description,
      price: priceNum,
      currency: draft.currency,
      photos: draft.photos,
      is_published: draft.is_published,
    };
    const res = draft.id
      ? await supabase.from("salon_products").update(row).eq("id", draft.id)
      : await supabase.from("salon_products").insert(row);
    setSaving(false);
    if (res.error) return setError(res.error.message);
    setDraft(null);
    router.refresh();
  };

  const togglePublish = async (p: SalonProduct) => {
    const { error } = await supabase.from("salon_products").update({ is_published: !p.is_published }).eq("id", p.id);
    if (error) setError(error.message);
    else router.refresh();
  };

  const remove = async (p: SalonProduct) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("salon_products").delete().eq("id", p.id);
    if (error) setError(error.message);
    else router.refresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "var(--fs-lg)", letterSpacing: "var(--ls-normal)" }}>{SALON_COPY.admin.title}</h1>
        <button onClick={signOut} style={pill}>{SALON_COPY.admin.signOut}</button>
      </div>
      <p style={{ fontSize: "var(--fs-sm)", opacity: 0.6, marginTop: 4 }}>{adminEmail}</p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 600, letterSpacing: "var(--ls-caps)", textTransform: "uppercase" }}>{SALON_COPY.admin.products}</h2>
        <button onClick={startAdd} style={pillSolid}>{SALON_COPY.admin.addProduct}</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {products.map((p) => (
          <div key={p.id} style={rowStyle}>
            <div>
              <div style={{ fontSize: "var(--fs-md)" }}>{p.name}</div>
              <div style={{ fontSize: "var(--fs-sm)", opacity: 0.6 }}>
                {SALON_COPY.categories[p.category]} · {formatPrice(p.price, p.currency)} · {p.is_published ? SALON_COPY.admin.published : SALON_COPY.admin.draft}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => togglePublish(p)} style={pill}>{p.is_published ? SALON_COPY.admin.unpublish : SALON_COPY.admin.publish}</button>
              <button onClick={() => startEdit(p)} style={pill}>{SALON_COPY.admin.edit}</button>
              <button onClick={() => remove(p)} style={pillDanger}>{SALON_COPY.admin.delete}</button>
            </div>
          </div>
        ))}
      </div>

      {draft ? (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)", borderRadius: 12 }}>
          <Field label={SALON_COPY.admin.fieldName}>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.fieldCategory}>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as SalonCategory })} style={input}>
              {SALON_CATEGORIES.map((c) => <option key={c} value={c}>{SALON_COPY.categories[c]}</option>)}
            </select>
          </Field>
          <Field label={SALON_COPY.admin.fieldDescription}>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={4} style={{ ...input, resize: "vertical" }} />
          </Field>
          <div style={{ display: "flex", gap: 12 }}>
            <Field label={SALON_COPY.admin.fieldPrice}>
              <input value={draft.price} inputMode="decimal" onChange={(e) => setDraft({ ...draft, price: e.target.value })} style={input} />
            </Field>
            <Field label={SALON_COPY.admin.fieldCurrency}>
              <input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} style={input} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <PhotoUploader productId={draftId} photos={draft.photos} onChange={(photos) => setDraft({ ...draft, photos })} />
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: "var(--fs-md)" }}>
            <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} />
            {SALON_COPY.admin.published}
          </label>
          {error ? <div style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 10 }}>{error}</div> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={save} disabled={saving} style={pillSolid}>{SALON_COPY.admin.save}</button>
            <button onClick={() => setDraft(null)} style={pill}>{SALON_COPY.admin.cancel}</button>
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36 }}>
        <h2 style={{ fontSize: "var(--fs-md)", fontWeight: 600, letterSpacing: "var(--ls-caps)", textTransform: "uppercase" }}>{SALON_COPY.admin.shops}</h2>
        <button onClick={startAddShop} style={pillSolid}>{SALON_COPY.admin.addShop}</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {shops.map((s) => (
          <div key={s.id} style={rowStyle}>
            <div>
              <div style={{ fontSize: "var(--fs-md)" }}>{s.shop_name}</div>
              <div style={{ fontSize: "var(--fs-sm)", opacity: 0.6 }}>
                {SALON_COPY.categories[s.category]}{s.map_address ? ` · ${s.map_address}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => startEditShop(s)} style={pill}>{SALON_COPY.admin.edit}</button>
              <button onClick={() => removeShop(s)} style={pillDanger}>{SALON_COPY.admin.delete}</button>
            </div>
          </div>
        ))}
      </div>

      {shopDraft ? (
        <div style={{ marginTop: 20, padding: 16, border: "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)", borderRadius: 12 }}>
          <Field label={SALON_COPY.admin.fieldCategory}>
            <select value={shopDraft.category} onChange={(e) => setShopDraft({ ...shopDraft, category: e.target.value as SalonCategory })} style={input}>
              {SALON_CATEGORIES.map((c) => <option key={c} value={c}>{SALON_COPY.categories[c]}</option>)}
            </select>
          </Field>
          <Field label={SALON_COPY.admin.shopName}>
            <input value={shopDraft.shop_name} onChange={(e) => setShopDraft({ ...shopDraft, shop_name: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.onlineUrl}>
            <input value={shopDraft.online_url} onChange={(e) => setShopDraft({ ...shopDraft, online_url: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.mapAddress}>
            <input value={shopDraft.map_address} onChange={(e) => setShopDraft({ ...shopDraft, map_address: e.target.value })} style={input} />
          </Field>
          <Field label={SALON_COPY.admin.googleMapsUrl}>
            <input value={shopDraft.google_maps_url} onChange={(e) => setShopDraft({ ...shopDraft, google_maps_url: e.target.value })} style={input} />
          </Field>
          {shopError ? <div style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 10 }}>{shopError}</div> : null}
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button onClick={saveShop} disabled={shopSaving} style={pillSolid}>{SALON_COPY.admin.save}</button>
            <button onClick={() => setShopDraft(null)} style={pill}>{SALON_COPY.admin.cancel}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginTop: 10 }}>
      <span style={{ display: "block", fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  width: "100%", fontSize: "var(--fs-md)", padding: "8px 10px", borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--foreground) 20%, transparent)",
  background: "transparent", color: "inherit",
};
const pill: React.CSSProperties = {
  fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase",
  padding: "6px 12px", borderRadius: 999, cursor: "pointer", color: "inherit",
  border: "1px solid color-mix(in srgb, var(--foreground) 25%, transparent)", background: "transparent",
};
const pillSolid: React.CSSProperties = { ...pill, background: "var(--foreground)", color: "var(--background)" };
const pillDanger: React.CSSProperties = { ...pill, color: "#c0392b", borderColor: "#c0392b" };
const rowStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
  padding: "12px 14px", borderRadius: 10,
  border: "1px solid color-mix(in srgb, var(--foreground) 12%, transparent)",
};
