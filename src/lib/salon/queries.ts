import { createClient } from "@/lib/supabase/server";
import type { SalonProduct, SalonShop } from "@/lib/salon/types";

export async function getPublishedProducts(): Promise<SalonProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salon_products")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalonProduct[];
}

export async function getAllProducts(): Promise<SalonProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salon_products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalonProduct[];
}

export async function getAllShops(): Promise<SalonShop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("salon_shops")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SalonShop[];
}
