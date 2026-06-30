export type SalonCategory = "hair" | "decorations" | "others";

export const SALON_CATEGORIES: SalonCategory[] = ["hair", "decorations", "others"];

export interface SalonProduct {
  id: string;
  category: SalonCategory;
  name: string;
  description: string;
  price: number;
  currency: string;
  photos: string[];
  is_published: boolean;
  sort_order: number;
}

export interface SalonShop {
  id: string;
  category: SalonCategory;
  shop_name: string;
  online_url: string | null;
  map_address: string | null;
  google_maps_url: string | null;
  sort_order: number;
}

export type SalonProductInput = Omit<SalonProduct, "id">;
export type SalonShopInput = Omit<SalonShop, "id">;
