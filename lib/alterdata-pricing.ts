export const BACKOFFICE_UNIT_PRICE = 120;
export const FRANQUEADO_UNIT_PRICE = 160;

export const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBRL = (n: number) => BRL.format(n);

export const monthlyCost = (acessosBackoffice: number) => acessosBackoffice * BACKOFFICE_UNIT_PRICE;
export const annualCost = (acessosBackoffice: number) => monthlyCost(acessosBackoffice) * 12;
