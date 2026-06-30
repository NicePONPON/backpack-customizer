import type { Metadata } from "next";
import SalonHeader from "@/components/salon/SalonHeader";
import SalonFooter from "@/components/salon/SalonFooter";

export const metadata: Metadata = {
  title: "Salon Catalogue",
  description: "Browse salon supplies and find where to buy in Eswatini.",
};

export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
      <SalonHeader />
      <main style={{ flex: 1, width: "100%", maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
      <SalonFooter />
    </div>
  );
}
