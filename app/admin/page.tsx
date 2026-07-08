import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminMonitorDashboard } from "@/components/admin-monitor-dashboard";
import { TicketsTiDashboard } from "@/components/tickets-ti-dashboard";
import { PortalHeader } from "@/components/portal-header";
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
      description: "Visão geral dos 3 serviços: usuários por mês, importação e planilhas.",
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
  if (modules.includes("nucleo_ti")) {
    cards.push({
      href: "/admin/nucleo-ti",
      title: "Núcleo TI",
      description: "Matriz RACI, carga por pessoa, backlog de tarefas e pipeline de automações do setor.",
    });
  }
  if (modules.includes("alterdata")) {
    cards.push({
      href: "/admin/alterdata",
      title: "Alterdata",
      description: "Controle de clientes ativos, inativos, inadimplentes, congelados e distratados na plataforma Alterdata.",
    });
  }
  if (modules.includes("chips")) {
    cards.push({
      href: "/admin/chips",
      title: "Chips",
      description: "Controle de chips de telefone: empresas, operadoras, recargas e vencimentos.",
    });
  }
  if (modules.includes("dominio")) {
    cards.push({
      href: "/admin/dominio",
      title: "Domínio",
      description: "Acompanhe SSCs do portal DOMÍNIO/ONVIO e receba alertas de novas respostas por email.",
    });
  }
  if (modules.includes("iungo")) {
    cards.push({
      href: "/admin/iungo",
      title: "IUNGO",
      description: "Ramais PABX: status, credenciais, telefones e funcionários vinculados.",
    });
  }
  if (modules.includes("tickets_ti")) {
    cards.push({
      href: "/admin/tickets-ti",
      title: "Tickets TI",
      description: "Chamados da equipe de TI: gráfico por status e notificação de ticket novo.",
    });
  }

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <header>
            <p className="section-label">Gerencial</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Central da empresa</h1>
            <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
              Informações operacionais, acessos, certificados e indicadores financeiros em um só lugar.
              Escolha abaixo o módulo autorizado para o seu usuário.
            </p>
          </header>
          <PortalHeader />
        </div>

        {modules.includes("monitoramento") && (
          <div className="mb-10">
            <AdminMonitorDashboard />
          </div>
        )}

        {modules.includes("tickets_ti") && (
          <div className="mb-10">
            <TicketsTiDashboard variant="home" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.sort((a, b) => a.title.localeCompare(b.title, "pt-BR")).map((card) => (
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
