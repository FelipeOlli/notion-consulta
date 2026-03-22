/**
 * E-mail do administrador principal: não pode ser editado, excluído nem recriado por API de usuários.
 * No Financeiro: único que pode importar, editar linhas, alocar empresas e CRUD de empresas do serviço.
 * Em Acessos: único que pode incluir, editar ou excluir links (POST/PATCH/DELETE).
 * Em Certificados: único que pode incluir, editar ou excluir (POST/PATCH/DELETE).
 * Opcional: LOCKED_PRIMARY_ADMIN_EMAIL no .env (padrão ti@cfcontabilidade.com).
 */
export const LOCKED_PRIMARY_ADMIN_EMAIL = (
  process.env.LOCKED_PRIMARY_ADMIN_EMAIL ?? "ti@cfcontabilidade.com"
)
  .trim()
  .toLowerCase();

export function isLockedPrimaryAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === LOCKED_PRIMARY_ADMIN_EMAIL;
}
