import { getAdminSession } from "@/lib/session";
import type { AppModule } from "@/lib/modules";

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
