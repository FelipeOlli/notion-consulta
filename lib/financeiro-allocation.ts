/** Rótulo para linhas sem empresa alocada (métricas e filtros). */
export const FINANCEIRO_SEM_EMPRESA = "Sem empresa";

export function allocationDisplayLabel(company: { name: string } | null | undefined): string {
  const n = company?.name?.trim();
  return n && n.length > 0 ? n : FINANCEIRO_SEM_EMPRESA;
}
