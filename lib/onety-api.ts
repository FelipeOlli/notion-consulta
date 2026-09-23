/**
 * Onety API client for notion-consulta.
 * Mirrors the pattern used in lib/tim-api.ts.
 *
 * Environment variables required in .env:
 *   ONETY_API_URL=https://back.cfonety.com.br
 *   ONETY_API_KEY=<key>
 */

const BASE_URL = (process.env.ONETY_API_URL ?? 'https://back.cfonety.com.br').replace(/\/$/, '');
const API_KEY  = process.env.ONETY_API_KEY ?? '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnetyTarefa = {
  id: string | number;
  assunto?: string;
  status?: string;
  situacao?: string;
  data_criacao?: string;
  data_prazo?: string;
  data_conclusao?: string;
  franquia?: string;
  colaborador?: string;
  software_origem?: string;
  detalhe_base?: string;
  empresa_codigo?: string;
  [key: string]: unknown;
};

export type OnetyTransbordo = {
  id: string | number;
  franquia?: string;
  status?: string;
  situacao?: string;
  data_criacao?: string;
  [key: string]: unknown;
};

export type OnetySaida = {
  id: string | number;
  franquia?: string;
  status?: string;
  situacao?: string;
  tipo?: string;
  data_criacao?: string;
  [key: string]: unknown;
};

export type OnetyPrTarefa = {
  id: string | number;
  assunto?: string;
  status?: string;
  situacao?: string;
  data_criacao?: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Core fetch helper -- handles pagination automatically
// ---------------------------------------------------------------------------

function isConfigured(): boolean {
  return Boolean(BASE_URL && API_KEY);
}

async function onetyFetchAll<T>(
  endpoint: string,
  listKey: string = 'tarefas',
  extraParams: Record<string, string> = {}
): Promise<T[]> {
  if (!isConfigured()) {
    console.warn('[onety-api] ONETY_API_URL ou ONETY_API_KEY nao configurado.');
    return [];
  }

  const pageSize = 100;
  const base = BASE_URL + '/' + endpoint;

  const buildUrl = (page: number) => {
    const url = new URL(base);
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('page', String(page));
    for (const [k, v] of Object.entries(extraParams)) url.searchParams.set(k, v);
    return url.toString();
  };

  const headers = { 'x-api-key': API_KEY };

  const initRes = await fetch(buildUrl(1), { headers, cache: 'no-store' });
  if (!initRes.ok) {
    throw new Error('[onety-api] ' + endpoint + ' respondeu ' + initRes.status);
  }

  const initData = await initRes.json() as Record<string, unknown>;
  const total: number = (initData.total as number) ?? 0;
  const firstList: T[] = ((initData[listKey] ?? initData['data'] ?? []) as T[]);

  if (total <= pageSize) return firstList;

  const pages = Math.ceil(total / pageSize);
  const promises = Array.from({ length: pages - 1 }, (_, i) =>
    fetch(buildUrl(i + 2), { headers, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => (((d as Record<string, unknown>)[listKey] ?? (d as Record<string, unknown>)['data'] ?? []) as T[]))
      .catch(() => [] as T[])
  );

  const rest = await Promise.all(promises);
  return [...firstList, ...rest.flat()];
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/** Tarefas operacionais TI -- Processo 62 (Cadastro de empresas). */
export async function fetchTarefas(): Promise<OnetyTarefa[]> {
  return onetyFetchAll<OnetyTarefa>('central-tecnologia/dashboard-externo/tarefas', 'tarefas');
}

/** Transbordos (troca de base) -- processos de migracao. */
export async function fetchTransbordos(): Promise<OnetyTransbordo[]> {
  return onetyFetchAll<OnetyTransbordo>('central-tecnologia/dashboard-externo/transbordos', 'transbordos');
}

/**
 * Saidas e desligamentos -- Processos 67/69.
 * @param tipo "todos" | "saida" | "desligamento" (default: "todos")
 */
export async function fetchSaidas(tipo = 'todos'): Promise<OnetySaida[]> {
  return onetyFetchAll<OnetySaida>('gestao/saidas-externo/tarefas', 'tarefas', { tipo });
}

/** PRs comerciais -- Processo 61 (Entrada de franquias). */
export async function fetchPrComercial(): Promise<OnetyPrTarefa[]> {
  return onetyFetchAll<OnetyPrTarefa>('gestao/pr-externo/tarefas', 'tarefas');
}

export { isConfigured as isOnetyConfigured };