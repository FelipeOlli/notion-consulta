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
};

const hrefs: Record<AppModule, string> = {
  senha: "/admin/links",
  certificados: "/admin/certificados",
  financeiro: "/admin/financeiro",
  usuarios: "/admin/usuarios",
  cadastro_empresa: "/admin/cadastro-empresa",
  nucleo_ti: "/admin/nucleo-ti",
};

export function getPortalCardsForModules(modules: AppModule[]): PortalModuleCard[] {
  return modules.map((module) => ({
    module,
    href: hrefs[module],
    title: moduleLabels[module],
    description: descriptions[module],
  }));
}
