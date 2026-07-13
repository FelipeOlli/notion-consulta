import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { AlterdataDashboard } from "@/components/alterdata-dashboard";

export default async function AlterdataPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("alterdata" as AppModule)) redirect("/admin");

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);
  const isMaster = session.role === "master";
  const notebookLmUrl = process.env.ALTERDATA_NOTEBOOKLM_URL ?? "";

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">Alterdata</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Clientes Alterdata</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Controle de status, licenças e situação de cada cliente na plataforma Alterdata.
          </p>
        </header>

        <AlterdataDashboard isMaster={isMaster} currentEmail={session.email} notebookLmUrl={notebookLmUrl} />
      </div>
    </main>
  );
}
