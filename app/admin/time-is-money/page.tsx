import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { TimeIsMoneyDashboard } from "@/components/time-is-money-dashboard";

export default async function TimeIsMoneyPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("time_is_money" as AppModule))
    redirect("/admin");

  const isMaster = session.role === "master";
  const modules: AppModule[] = isMaster ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-6">
          <p className="section-label">Equipe</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Time is Money</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Monitoramento de produtividade e status da equipe via API do Time is Money.
          </p>
        </header>

        <TimeIsMoneyDashboard variant="full" isMaster={isMaster} />
      </div>
    </main>
  );
}
