import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { TvDashboard } from "@/components/tv-dashboard";

export default async function AdminTvPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master") redirect("/admin");

  return <TvDashboard />;
}
