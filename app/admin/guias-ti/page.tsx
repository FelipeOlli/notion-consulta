import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";

export default async function GuiasTiPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const modules = session.role === "master" ? ["guias_ti"] : (session.modules ?? []);
  if (!modules.includes("guias_ti")) redirect("/admin");

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="section-label">TI</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Guias e dados TI</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Guias e processos arquivados para uso do time em caso de necessidade.
          </p>
        </header>

        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-lg font-semibold text-white">🚧 Em construção</p>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Este módulo está sendo desenvolvido.
          </p>
        </div>
      </div>
    </main>
  );
}
