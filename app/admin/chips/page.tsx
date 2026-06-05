import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { ChipsDashboard } from "@/components/chips-dashboard";
import { prisma } from "@/lib/prisma";

export default async function ChipsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("chips" as AppModule)) redirect("/admin");

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  const [chips, empresas] = await Promise.all([
    prisma.chip.findMany({ include: { empresa: true }, orderBy: { empresa: { nome: "asc" } } }),
    prisma.chipEmpresa.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">Chips</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Controle de Chips</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Gerencie os chips de telefone corporativos, operadoras e datas de recarga.
          </p>
        </header>

        <ChipsDashboard initialChips={chips} initialEmpresas={empresas} />
      </div>
    </main>
  );
}
