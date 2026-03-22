/**
 * E-mail do administrador principal: não pode ser editado, excluído nem recriado por API.
 * Também é o único usuário que pode alterar dados via API admin (POST/PATCH/DELETE); os demais ficam em leitura.
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
