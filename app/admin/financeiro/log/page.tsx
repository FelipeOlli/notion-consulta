import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { AdminFinanceiroSubNav } from "@/components/admin-financeiro-subnav";
import { AdminFinanceiroActivityLog } from "@/components/admin-financeiro-activity-log";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";

export default async function AdminFinanceiroLogPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("financeiro")) redirect("/admin");

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : session.modules ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />
        <AdminFinanceiroSubNav />
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Financeiro</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">Registro de atividades</h1>
          <p className="mt-2 text-sm text-slate-300">
            Histórico de importações, cadastro de empresas e alterações nas linhas dos snapshots.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/admin/financeiro" className="font-medium text-sky-400 hover:text-sky-300">
              Voltar ao dashboard
            </Link>
          </p>
        </header>
        <AdminFinanceiroActivityLog />
      </div>
    </main>
  );
}
