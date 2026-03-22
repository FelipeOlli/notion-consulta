import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import type { AppModule } from "@/lib/modules";
import { isLockedPrimaryAdminEmail } from "@/lib/locked-admin";

/** Mensagem retornada nas APIs quando quem está logado não pode alterar dados. */
export const PLATFORM_EDITOR_FORBIDDEN_MESSAGE =
  "Somente o administrador principal da plataforma pode alterar estes dados.";

/**
 * Quem pode criar/editar/excluir via API admin: apenas o e-mail definido em LOCKED_PRIMARY_ADMIN_EMAIL
 * (.env), por padrão ti@cfcontabilidade.com. Demais usuários podem apenas consultar (GET), se tiverem módulo.
 */
export async function ensurePlatformEditor(): Promise<boolean> {
  const session = await getAdminSession();
  if (!session?.email) return false;
  return isLockedPrimaryAdminEmail(session.email);
}

/** Use em POST/PATCH/DELETE admin: retorna 403 se não for o administrador principal. */
export async function platformEditorMutationGuard(): Promise<NextResponse | null> {
  if (!(await ensurePlatformEditor())) {
    return NextResponse.json({ message: PLATFORM_EDITOR_FORBIDDEN_MESSAGE }, { status: 403 });
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
