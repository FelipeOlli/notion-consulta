/**
 * E-mail do administrador principal: não pode ser editado, excluído nem recriado por API de usuários.
 * No módulo Financeiro, é o único que pode importar, editar linhas, alocar empresas e CRUD de empresas do serviço
 * (mutações em /api/admin/financeiro/*). Opcional: LOCKED_PRIMARY_ADMIN_EMAIL no .env (padrão ti@cfcontabilidade.com).
 */
export const LOCKED_PRIMARY_ADMIN_EMAIL = (
  process.env.LOCKED_PRIMARY_ADMIN_EMAIL ?? "ti@cfcontabilidade.com"
)
  .trim()
  .toLowerCase();

export function isLockedPrimaryAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === LOCKED_PRIMARY_ADMIN_EMAIL;
}
