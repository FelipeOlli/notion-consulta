import type { AppModule } from "@/lib/modules";
import { moduleLabels } from "@/lib/modules";

export type PortalModuleCard = {
  module: AppModule;
  href: string;
  title: string;
  description: string;
};

const descriptions: Record<AppModule, string> = {
  senha: "Credenciais, links e materiais liberados para a equipe.",
  certificados: "Empresas, documentos, arquivos e vencimentos de certificados.",
  financeiro: "E-mails por servidor, colaboradores, custos e monitoramento.",
  usuarios: "Criar e editar usuários do gerencial e módulos por e-mail.",
  cadastro_empresa: "Sistema externo de cadastro e gestão de empresas.",
  nucleo_ti: "Matriz RACI, carga por pessoa, backlog de tarefas e pipeline de automações do setor.",
  alterdata: "Controle de clientes ativos, inativos, inadimplentes, congelados e distratados na plataforma Alterdata.",
  chips: "Gerencie os chips de telefone corporativos, operadoras e datas de recarga.",
  dominio: "Acompanhe SSCs do portal DOMÍNIO/ONVIO e receba alertas de novas respostas por email.",
  iungo: "Ramais PABX: status, credenciais, telefones e funcionários vinculados.",
};

export const moduleHrefs: Record<AppModule, string> = {
  senha: "/admin/links",
  certificados: "/admin/certificados",
  financeiro: "/admin/financeiro",
  usuarios: "/admin/usuarios",
  cadastro_empresa: "/admin/cadastro-empresa",
  nucleo_ti: "/admin/nucleo-ti",
  alterdata: "/admin/alterdata",
  chips: "/admin/chips",
  dominio: "/admin/dominio",
  iungo: "/admin/iungo",
};

export function getPortalCardsForModules(modules: AppModule[]): PortalModuleCard[] {
  return modules.map((module) => ({
    module,
    href: moduleHrefs[module],
    title: moduleLabels[module],
    description: descriptions[module],
  }));
}
