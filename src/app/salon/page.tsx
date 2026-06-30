import SalonCatalogue from "@/app/salon/SalonCatalogue";
import { getPublishedProducts, getAllShops } from "@/lib/salon/queries";
import { groupShopsByCategory } from "@/lib/salon/shops";

export const dynamic = "force-dynamic";

export default async function SalonPage() {
  const [products, shops] = await Promise.all([getPublishedProducts(), getAllShops()]);
  const shopsByCategory = groupShopsByCategory(shops);
  return <SalonCatalogue products={products} shopsByCategory={shopsByCategory} />;
}
