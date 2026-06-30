const BUCKET = "salon";

export function photoPublicUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

// Deterministic-ish unique path: <productId>/<timestamp>-<slug>.<ext>
export function productPhotoPath(productId: string, fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext = (dot >= 0 ? fileName.slice(dot + 1) : "jpg").toLowerCase();
  const stem = (dot >= 0 ? fileName.slice(0, dot) : fileName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${productId}/${Date.now()}-${stem}.${ext}`;
}
