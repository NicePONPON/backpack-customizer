import { SALON_CATEGORIES, type SalonCategory, type SalonShop } from "@/lib/salon/types";

export function groupShopsByCategory(rows: SalonShop[]): Record<SalonCategory, SalonShop[]> {
  const grouped = Object.fromEntries(
    SALON_CATEGORIES.map((c) => [c, [] as SalonShop[]])
  ) as Record<SalonCategory, SalonShop[]>;
  for (const row of rows) grouped[row.category]?.push(row);
  return grouped;
}
