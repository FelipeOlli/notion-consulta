import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { AdminFinanceiroSubNav } from "@/components/admin-financeiro-subnav";
import { AdminFinanceiroDashboard } from "@/components/admin-financeiro-dashboard";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { isLockedPrimaryAdminEmail } from "@/lib/locked-admin";

export default async function FinanceiroCfComPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("financeiro" as AppModule))
    redirect("/admin");

  const modules: AppModule[] =
    session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);
  const canEditFinanceiro = session.email ? isLockedPrimaryAdminEmail(session.email) : false;

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />
        <AdminFinanceiroSubNav />
        <header className="mb-6">
          <p className="section-label">Financeiro</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">CFCONTABILIDADE.COM</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Usuários Google Workspace do servidor CFCONTABILIDADE.COM.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/admin/financeiro/log" className="link-accent font-medium">
              Ver registro de atividades →
            </Link>
          </p>
        </header>
        <AdminFinanceiroDashboard canEditFinanceiro={canEditFinanceiro} serviceFilter="cfCom" />
      </div>
    </main>
  );
}
