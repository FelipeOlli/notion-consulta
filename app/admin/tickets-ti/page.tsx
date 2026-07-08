import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { TicketsTiDashboard } from "@/components/tickets-ti-dashboard";

export default async function TicketsTiPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("tickets_ti" as AppModule))
    redirect("/admin");

  const modules: AppModule[] =
    session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  const apiUrl = (process.env.SCRUMHUB_API_URL ?? "").replace(/\/$/, "");
  const companyId = process.env.SCRUMHUB_COMPANY_ID ?? "";
  const scrumhubCompanyUrl =
    apiUrl && companyId ? `${apiUrl}/companies/${companyId}/tickets` : undefined;

  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-4 sm:px-6 lg:px-8 flex-shrink-0">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-6">
          <p className="section-label">TI</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Tickets TI</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Acompanhamento de chamados da equipe de TI em tempo real.
          </p>
        </header>
      </div>

      <div className="flex-1 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <TicketsTiDashboard variant="full" scrumhubCompanyUrl={scrumhubCompanyUrl} />
      </div>
    </main>
  );
}
