import type { AppModule as PrismaAppModule } from "@prisma/client";

export const appModules = ["senha", "certificados", "financeiro", "usuarios", "cadastro_empresa", "nucleo_ti", "alterdata", "chips", "dominio", "iungo"] as const;

export type AppModule = (typeof appModules)[number];

/** Todos os modulos exibidos para sessao master (env). */
export const ALL_MODULES_FOR_MASTER: AppModule[] = [
  "senha",
  "certificados",
  "financeiro",
  "usuarios",
  "cadastro_empresa",
  "nucleo_ti",
  "alterdata",
  "chips",
  "dominio",
  "iungo",
];

export const moduleLabels: Record<AppModule, string> = {
  senha: "Acessos",
  certificados: "Certificados",
  financeiro: "Financeiro",
  usuarios: "E-mails cadastrados",
  cadastro_empresa: "Cadastro de empresa",
  nucleo_ti: "Núcleo TI",
  alterdata: "Alterdata",
  chips: "Chips",
  dominio: "Domínio",
  iungo: "IUNGO",
};

export function normalizeModule(value: string): AppModule | null {
  const v = value.trim().toLowerCase();
  if (appModules.includes(v as AppModule)) return v as AppModule;
  return null;
}

export function toPrismaModule(moduleKey: AppModule): PrismaAppModule {
  switch (moduleKey) {
    case "senha":
      return "SENHA";
    case "certificados":
      return "CERTIFICADOS";
    case "financeiro":
      return "FINANCEIRO";
    case "usuarios":
      return "USUARIOS";
    case "cadastro_empresa":
      return "CADASTRO_EMPRESA";
    case "alterdata":
      return "ALTERDATA";
    case "chips":
      return "CHIPS";
    case "dominio":
      return "DOMINIO";
    case "iungo":
      return "IUNGO";
    case "nucleo_ti":
      throw new Error("nucleo_ti não existe no banco de dados");
  }
}

export function fromPrismaModule(moduleKey: PrismaAppModule): AppModule {
  switch (moduleKey) {
    case "SENHA":
      return "senha";
    case "CERTIFICADOS":
      return "certificados";
    case "FINANCEIRO":
      return "financeiro";
    case "USUARIOS":
      return "usuarios";
    case "CADASTRO_EMPRESA":
      return "cadastro_empresa";
    case "ALTERDATA":
      return "alterdata";
    case "CHIPS":
      return "chips";
    case "DOMINIO":
      return "dominio";
    case "IUNGO":
      return "iungo";
    default:
      throw new Error(`Módulo desconhecido: ${moduleKey}`);
  }
}
