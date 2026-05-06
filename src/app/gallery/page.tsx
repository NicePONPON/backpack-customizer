import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ThemedPage from "@/components/ThemedPage";
import { loadAdvertisements } from "@/lib/loadAdvertisements";
import { getLocale } from "@/i18n/getLocale";
import GalleryPageClient from "./GalleryPageClient";

export default async function GalleryPage() {
  const locale = await getLocale();
  const ads = loadAdvertisements(locale);

  return (
    <ThemedPage>
      <SiteHeader />
      <GalleryPageClient ads={ads} />
      <SiteFooter />
    </ThemedPage>
  );
}
