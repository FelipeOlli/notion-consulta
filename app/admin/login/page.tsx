import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/session";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin/links");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-black via-slate-950 to-black p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Notion Consulta</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-50">Painel administrador</h1>
        <p className="mt-2 text-sm text-slate-300">
          Entre para gerenciar os links que aparecem na pagina principal apos o login.
        </p>

        <div className="mt-6">
          <AdminLoginForm />
        </div>

        <Link
          href="/"
          className="mt-5 inline-block text-sm font-medium text-slate-300 hover:text-white"
        >
          Voltar para pagina principal
        </Link>
      </div>
    </main>
  );
}
