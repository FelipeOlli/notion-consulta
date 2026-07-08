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

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">TI</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Tickets TI</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Acompanhamento de chamados da equipe de TI em tempo real.
          </p>
        </header>

        <TicketsTiDashboard variant="full" />
      </div>
    </main>
  );
}
