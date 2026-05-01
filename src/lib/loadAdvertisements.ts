import fs from "node:fs";
import path from "node:path";

import type { Locale } from "@/i18n/getLocale";

export type AdImage = { src: string; alt: string };

const ALT_TEXT: Record<Locale, (slot: string) => string> = {
  en: (slot) => `Computex ${slot.replace(/[-_]/g, " ").trim()}`,
  "zh-TW": (slot) => `Computex ${slot.replace(/[-_]/g, " ").trim()} 廣告`,
};

export function loadAdvertisements(locale: Locale): AdImage[] {
  const prefix = locale === "zh-TW" ? "TW-" : "EN-";
  const dir = path.join(process.cwd(), "public/advertisement");

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  const SLOT_ORDER = ["Hero", "Comparison", "Segregation"];

  return entries
    .filter((f) => f.startsWith(prefix) && f.toLowerCase().endsWith(".png"))
    .sort((a, b) => {
      const slotA = a.slice(prefix.length).replace(/\.png$/i, "");
      const slotB = b.slice(prefix.length).replace(/\.png$/i, "");
      const ia = SLOT_ORDER.indexOf(slotA);
      const ib = SLOT_ORDER.indexOf(slotB);
      const orderA = ia === -1 ? SLOT_ORDER.length : ia;
      const orderB = ib === -1 ? SLOT_ORDER.length : ib;
      return orderA - orderB;
    })
    .map((f) => ({
      src: `/advertisement/${f}`,
      alt: ALT_TEXT[locale](f.slice(prefix.length).replace(/\.png$/i, "")),
    }));
}
