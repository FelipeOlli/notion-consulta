/**
 * E-mail do administrador principal: não pode ser editado, excluído nem recriado por API.
 * Opcional: defina LOCKED_PRIMARY_ADMIN_EMAIL no .env para sobrescrever (mesmo padrão em dev).
 */
export const LOCKED_PRIMARY_ADMIN_EMAIL = (
  process.env.LOCKED_PRIMARY_ADMIN_EMAIL ?? "ti@cfcontabilidade.com"
)
  .trim()
  .toLowerCase();

export function isLockedPrimaryAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === LOCKED_PRIMARY_ADMIN_EMAIL;
}
