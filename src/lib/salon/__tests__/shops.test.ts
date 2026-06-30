import { describe, it, expect } from "vitest";
import { groupShopsByCategory } from "@/lib/salon/shops";
import type { SalonShop } from "@/lib/salon/types";

const shop = (over: Partial<SalonShop>): SalonShop => ({
  id: "x", category: "hair", shop_name: "S", online_url: null,
  map_address: null, google_maps_url: null, sort_order: 0, ...over,
});

describe("groupShopsByCategory", () => {
  it("buckets shops by category", () => {
    const rows = [
      shop({ id: "1", category: "hair" }),
      shop({ id: "2", category: "others" }),
      shop({ id: "3", category: "hair" }),
    ];
    const grouped = groupShopsByCategory(rows);
    expect(grouped.hair.map((s) => s.id)).toEqual(["1", "3"]);
    expect(grouped.others.map((s) => s.id)).toEqual(["2"]);
    expect(grouped.decorations).toEqual([]);
  });
});
