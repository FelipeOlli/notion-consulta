import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { AdminMonitorDashboard } from "@/components/admin-monitor-dashboard";
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
  if (modules.includes("cadastro_empresa")) {
    cards.push({
      href: "/admin/cadastro-empresa",
      title: "Cadastro de empresa",
      description: "Sistema externo de cadastro e gestão de empresas.",
    });
  }

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mb-8">
          <p className="section-label">Gerencial</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Central da empresa</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Informações operacionais, acessos, certificados e indicadores financeiros em um só lugar.
            Escolha abaixo o módulo autorizado para o seu usuário.
          </p>
        </header>

        <div className="mb-10">
          <AdminMonitorDashboard />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className="glass-card group rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white transition-colors group-hover:text-[#4da3ff]">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--onity-dark-text-muted)" }}>
                {card.description}
              </p>
              <span
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors group-hover:text-[#4da3ff]"
                style={{ color: "#1d7fe5" }}
              >
                Abrir módulo →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
