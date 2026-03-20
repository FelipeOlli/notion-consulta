/** Tamanho maximo para rotulo de empresa (override ou base). */
export const MAX_COMPANY_LABEL_LEN = 240;

/** Empresa exibida / agrupada: override manual ou valor vindo do import. */
export function effectiveCompanyLabel(override: string | null | undefined, importedLabel: string): string {
  const o = typeof override === "string" ? override.trim() : "";
  if (o.length > 0) return o.slice(0, MAX_COMPANY_LABEL_LEN);
  const b = (importedLabel ?? "").trim();
  return b.length > 0 ? b.slice(0, MAX_COMPANY_LABEL_LEN) : "Sem empresa";
}

/** Define override para que a empresa efetiva seja `effectiveDesired` dado o rotulo base gravado em `companyLabel`. */
export function companyOverrideForEffective(baseLabel: string, effectiveDesired: string): string | null {
  const b = baseLabel.trim().slice(0, MAX_COMPANY_LABEL_LEN);
  const e = effectiveDesired.trim().slice(0, MAX_COMPANY_LABEL_LEN);
  if (e.length === 0) return null;
  if (e === b) return null;
  return e;
}
