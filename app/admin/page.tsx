import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { getAdminSession } from "@/lib/session";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";

type HubCard = {
  href: string;
  title: string;
  description: string;
};

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const isMaster = session.role === "master";
  const modules: AppModule[] = isMaster ? [...ALL_MODULES_FOR_MASTER] : session.modules ?? [];

  if (!isMaster && modules.length === 0) {
    redirect("/");
  }

  const cards: HubCard[] = [];
  if (modules.includes("senha")) {
    cards.push({
      href: "/admin/links",
      title: "Acessos",
      description: "Credenciais, links e materiais liberados para a equipe.",
    });
  }
  if (modules.includes("certificados")) {
    cards.push({
      href: "/admin/certificados",
      title: "Certificados digitais",
      description: "Empresas, documentos, arquivos, vencimentos e dados do certificado.",
    });
  }
  if (modules.includes("financeiro")) {
    cards.push({
      href: "/admin/financeiro",
      title: "Financeiro",
      description: "E-mails por servidor, colaboradores, custos e monitoramento por empresa.",
    });
  }
  if (modules.includes("usuarios")) {
    cards.push({
      href: "/admin/usuarios",
      title: "E-mails cadastrados",
      description: "Crie e edite usuários do gerencial: e-mail, senha e módulos liberados para cada conta.",
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Gerencial</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">Central da empresa</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Informações operacionais, acessos, certificados e indicadores financeiros em um só lugar. Escolha abaixo o
            módulo autorizado para o seu usuário.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-sm transition hover:border-sky-500/50 hover:bg-slate-900/90"
            >
              <h2 className="text-lg font-semibold text-slate-50 group-hover:text-sky-200">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.description}</p>
              <span className="mt-4 inline-flex text-sm font-medium text-sky-400 group-hover:text-sky-200">
                Abrir módulo →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
