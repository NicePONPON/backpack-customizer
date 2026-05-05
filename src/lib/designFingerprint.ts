import type { DesignState } from "@/lib/invoiceSerialization";

// Stable hash from visual-only attributes (size, panel colors, zipper).
// Embroidery text is excluded — it's personal. Two users picking the same
// color scheme + size are counted as voting for the same "style".
export function designFingerprint(state: DesignState): string {
  const sortedColors = Object.fromEntries(
    Object.entries(state.colors).sort(([a], [b]) => a.localeCompare(b))
  );
  return JSON.stringify({
    size: state.size,
    colors: sortedColors,
    zipperUpgrade: state.zipperUpgrade,
    zipperColor: state.zipperColor,
  });
}
