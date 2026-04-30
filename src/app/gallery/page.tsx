import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { loadAdvertisements } from "@/lib/loadAdvertisements";
import { getLocale } from "@/i18n/getLocale";
import GalleryPageClient from "./GalleryPageClient";

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#555555, #222222)",
  backgroundAttachment: "fixed",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0 24px 48px",
  gap: 48,
  color: "#fff",
};

export default async function GalleryPage() {
  const locale = await getLocale();
  const ads = loadAdvertisements(locale);

  return (
    <main style={pageBg}>
      <SiteHeader />
      <GalleryPageClient ads={ads} />
      <SiteFooter />
    </main>
  );
}
