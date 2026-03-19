import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";

/** Rota legada: o hub único é /admin (Central da empresa), filtrado por módulos na sessão. */
export default async function PortalPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/");
  }
  const modules = session.modules ?? [];
  if (session.role === "master" || modules.length > 0) {
    redirect("/admin");
  }
  redirect("/");
}
