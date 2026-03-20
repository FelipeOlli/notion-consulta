/** Nomes exatos dos serviços no banco (seed / EmailServer). */
export const FINANCEIRO_SERVICE_NAMES = {
  timeIsMoney: "Time Is Money",
  cfCom: "CFCONTABILIDADE.COM",
  cfComBr: "CFCONTABILIDADE.COM.BR",
} as const;

export type FinanceiroServiceKey = keyof typeof FINANCEIRO_SERVICE_NAMES;

export const FINANCEIRO_SERVICE_KEYS: FinanceiroServiceKey[] = ["cfCom", "cfComBr", "timeIsMoney"];

export function serviceKeyFromForm(value: string): FinanceiroServiceKey | null {
  const v = value.trim().toLowerCase();
  if (v === "cf-com" || v === "cfcom") return "cfCom";
  if (v === "cf-com-br" || v === "cfcombr") return "cfComBr";
  if (v === "time-is-money" || v === "tim") return "timeIsMoney";
  return null;
}

export function serverNameForKey(key: FinanceiroServiceKey): string {
  return FINANCEIRO_SERVICE_NAMES[key];
}
