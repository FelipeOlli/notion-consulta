import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";

export default async function SegurancaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("seguranca" as AppModule))
    redirect("/admin");

  const modules: AppModule[] =
    session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">Gerencial</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Segurança</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Gestão de acessos, senhas, políticas de segurança e controle de permissões.
          </p>
        </header>

        {/* Conteúdo do módulo de Segurança */}
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            border: "1px dashed rgba(29,127,229,0.2)",
            background: "rgba(8,15,26,0.4)",
          }}
        >
          <p className="text-base" style={{ color: "var(--onity-dark-text-muted)" }}>
            Módulo em construção.
          </p>
        </div>
      </div>
    </main>
  );
}
