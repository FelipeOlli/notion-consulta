import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import type { AppModule } from "@/lib/modules";
import { isLockedPrimaryAdminEmail } from "@/lib/locked-admin";

/** Mensagem quando o e-mail logado não pode alterar dados do Financeiro (planilha / alocação). */
export const FINANCEIRO_EDITOR_FORBIDDEN_MESSAGE =
  "Somente o administrador principal pode editar linhas do servico e alocar empresas neste modulo.";

/** Mensagem para inclusão, edição ou exclusão no módulo Acessos (links). */
export const ACESSOS_EDITOR_FORBIDDEN_MESSAGE =
  "Somente o administrador principal pode incluir, editar ou excluir acessos.";

/** E-mail = LOCKED_PRIMARY_ADMIN_EMAIL (ex.: ti@cfcontabilidade.com). */
export async function ensureLockedPrimaryAdminEmail(): Promise<boolean> {
  const session = await getAdminSession();
  if (!session?.email) return false;
  return isLockedPrimaryAdminEmail(session.email);
}

/** Use só em POST/PATCH/DELETE das rotas /api/admin/financeiro/*. */
export async function financeiroMutationGuard(): Promise<NextResponse | null> {
  if (!(await ensureLockedPrimaryAdminEmail())) {
    return NextResponse.json({ message: FINANCEIRO_EDITOR_FORBIDDEN_MESSAGE }, { status: 403 });
  }
  return null;
}

/** Use em POST /api/admin/links e PATCH/DELETE /api/admin/links/[id]. */
export async function linksMutationGuard(): Promise<NextResponse | null> {
  if (!(await ensureLockedPrimaryAdminEmail())) {
    return NextResponse.json({ message: ACESSOS_EDITOR_FORBIDDEN_MESSAGE }, { status: 403 });
  }
  return null;
}

/** Retorna true apenas se a sessão existe e o usuário é master (pode editar links). */
export async function ensureMaster() {
  const session = await getAdminSession();
  return session !== null && session.role === "master";
}

/** Mantido para compatibilidade: mesmo que ensureMaster. */
export async function ensureAdmin() {
  const session = await getAdminSession();
  return session !== null && (session.role === "master" || Boolean(session.modules?.length));
}

export async function ensureModuleAccess(moduleKey: AppModule) {
  const session = await getAdminSession();
  if (!session) return false;
  if (session.role === "master") return true;
  return Boolean(session.modules?.includes(moduleKey));
}

/** Master ou módulo E-mails cadastrados (CRUD de usuários). */
export async function ensureUserManagementAccess() {
  const session = await getAdminSession();
  if (!session) return false;
  if (session.role === "master") return true;
  return Boolean(session.modules?.includes("usuarios"));
}
