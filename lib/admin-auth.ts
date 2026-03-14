import { getAdminSession } from "@/lib/session";

/** Retorna true apenas se a sessão existe e o usuário é master (pode editar links). */
export async function ensureMaster() {
  const session = await getAdminSession();
  return session !== null && session.role === "master";
}

/** Mantido para compatibilidade: mesmo que ensureMaster. */
export async function ensureAdmin() {
  return ensureMaster();
}
