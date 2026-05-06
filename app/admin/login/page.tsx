import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminSession } from "@/lib/session";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session?.role === "master") redirect("/admin");
  if (session?.modules?.length) redirect("/admin");

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl p-7 sm:p-9"
        style={{
          background: "rgba(8,15,26,0.82)",
          border: "1px solid rgba(29,127,229,0.2)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 10px 40px -10px rgba(29,127,229,0.18)",
        }}
      >
        <p className="section-label">Portal corporativo</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Gerencial administrativo</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
          Acesso por e-mail e módulos liberados: senhas, certificados, financeiro e gestão de usuários.
        </p>

        <div className="mt-6">
          <AdminLoginForm />
        </div>

        <Link href="/" className="link-muted mt-5 inline-block text-sm font-medium">
          ← Voltar para página principal
        </Link>
      </div>
    </main>
  );
}
