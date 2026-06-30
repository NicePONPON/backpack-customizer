import { redirect } from "next/navigation";
import { getCurrentAdminEmail } from "@/lib/salon/admin";
import { getAllProducts, getAllShops } from "@/lib/salon/queries";
import AdminDashboard from "@/app/salon/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function SalonAdminPage() {
  const adminEmail = await getCurrentAdminEmail();
  if (!adminEmail) redirect("/salon/login");

  const [products, shops] = await Promise.all([getAllProducts(), getAllShops()]);
  return <AdminDashboard adminEmail={adminEmail} products={products} shops={shops} />;
}
