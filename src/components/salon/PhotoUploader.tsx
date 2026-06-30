"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { productPhotoPath, photoPublicUrl } from "@/lib/salon/storage";
import SALON_COPY from "@/app/salon/copy";

export default function PhotoUploader({
  productId,
  photos,
  onChange,
}: {
  productId: string;
  photos: string[];
  onChange: (paths: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const path = productPhotoPath(productId, file.name);
        const { error: upErr } = await supabase.storage.from("salon").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);
        uploaded.push(path);
      }
      onChange([...photos, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => onChange(photos.filter((_, k) => k !== i));

  return (
    <div>
      <label style={{ fontSize: "var(--fs-sm)", letterSpacing: "var(--ls-caps)", textTransform: "uppercase", opacity: 0.7 }}>
        {SALON_COPY.admin.fieldPhotos}
      </label>
      <div style={{ fontSize: "var(--fs-sm)", opacity: 0.6 }}>{SALON_COPY.admin.coverHint}</div>
      <input type="file" accept="image/*" multiple disabled={busy} onChange={(e) => handleFiles(e.target.files)} style={{ display: "block", marginTop: 8, fontSize: "var(--fs-sm)" }} />
      {busy ? <div style={{ fontSize: "var(--fs-sm)", marginTop: 6 }}>Uploading…</div> : null}
      {error ? <div style={{ fontSize: "var(--fs-sm)", color: "#c0392b", marginTop: 6 }}>{error}</div> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        {photos.map((path, i) => (
          <div key={path} style={{ width: 96 }}>
            <div style={{ position: "relative", width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: i === 0 ? "2px solid var(--foreground)" : "1px solid color-mix(in srgb, var(--foreground) 15%, transparent)" }}>
              <Image src={photoPublicUrl(path)} alt="" fill sizes="96px" style={{ objectFit: "cover" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "var(--fs-sm)" }}>
              <button type="button" onClick={() => move(i, -1)} style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}>←</button>
              <button type="button" onClick={() => remove(i)} style={{ cursor: "pointer", background: "none", border: "none", color: "#c0392b" }}>✕</button>
              <button type="button" onClick={() => move(i, 1)} style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}>→</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
