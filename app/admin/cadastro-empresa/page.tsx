import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { CadastroEmpresaIframe } from "@/components/cadastro-empresa-iframe";

export default async function CadastroEmpresaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("cadastro_empresa")) redirect("/admin");

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : session.modules ?? [];

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />
        <header className="mb-6">
          <p className="section-label">Gerencial</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Cadastro de empresa</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Sistema externo de cadastro e gestão de empresas.
          </p>
        </header>

        <div
          className="overflow-hidden rounded-2xl"
          style={{ border: "1px solid rgba(29,127,229,0.18)", height: "calc(100vh - 220px)", minHeight: "600px" }}
        >
          <CadastroEmpresaIframe />
        </div>
      </div>
    </main>
  );
}
