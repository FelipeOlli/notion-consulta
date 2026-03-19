import type { AppModule as PrismaAppModule } from "@prisma/client";

export const appModules = ["senha", "certificados", "financeiro", "usuarios"] as const;

export type AppModule = (typeof appModules)[number];

/** Todos os modulos exibidos para sessao master (env). */
export const ALL_MODULES_FOR_MASTER: AppModule[] = ["senha", "certificados", "financeiro", "usuarios"];

export const moduleLabels: Record<AppModule, string> = {
  senha: "Acessos",
  certificados: "Certificados",
  financeiro: "Financeiro",
  usuarios: "E-mails cadastrados",
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
  }
}
