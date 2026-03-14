import { redirect } from "next/navigation";
import { AdminLinksManager } from "@/components/admin-links-manager";
import { getAdminSession } from "@/lib/session";
import { listAdminLinks } from "@/lib/store";

export default async function AdminLinksPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master") redirect("/");

  const links = await listAdminLinks();

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Area master</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">Gerenciamento de links Notion</h1>
          <p className="mt-2 text-sm text-slate-300">
            Usuario master: cadastre, edite, oculte ou remova os links exibidos na pagina principal.
          </p>
        </header>
        <AdminLinksManager initialLinks={links} />
      </div>
    </main>
  );
}
