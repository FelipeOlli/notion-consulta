import { redirect } from "next/navigation";
import { AdminLinksManager } from "@/components/admin-links-manager";
import { AdminNav } from "@/components/admin-nav";
import { getAdminSession } from "@/lib/session";
import { listAdminLinks } from "@/lib/store";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { isLockedPrimaryAdminEmail } from "@/lib/locked-admin";

export default async function AdminLinksPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("senha")) redirect("/admin");

  const links = await listAdminLinks();
  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : session.modules ?? [];
  const canEditAcessos = session.email ? isLockedPrimaryAdminEmail(session.email) : false;

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Acessos</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">Gerenciamento de acessos e links</h1>
          <p className="mt-2 text-sm text-slate-300">
            Inclusao, edicao e exclusao de acessos ficam a cargo do administrador principal; demais usuarios com modulo
            Acessos podem apenas consultar a lista.
          </p>
        </header>
        <AdminLinksManager initialLinks={links} canEditAcessos={canEditAcessos} />
      </div>
    </main>
  );
}
