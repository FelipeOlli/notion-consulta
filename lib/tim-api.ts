import { prisma } from "@/lib/prisma";

/** Equipe inicial monitorada (seed único, quando TimMonitoredClient está vazio). */
export const TIM_TEAM_SEED = [
  { clientId: "bd078504-0b9f-4b26-9d9f-817b8a802cd8", fullName: "Andre Palmeiro", email: "andre.palmeiro@cffranquias.com.br" },
  { clientId: "f009c9ba-8d38-4627-9593-88eec23da3e0", fullName: "Pedro Freitas", email: "pedro.freitas@cffranquias.com.br" },
  { clientId: "4da2ecfa-92c3-41fc-a7a9-6abef2a4263a", fullName: "Gabriel Rozzato", email: "gabriel.rozzato@cffranquias.com.br" },
];

export type TimClient = {
  id: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  isDeleted: boolean;
  deviceInfoHistory: {
    machineName?: string;
    publicIP?: string;
    privateIP?: string;
    os?: string;
    currentUtcTime?: string;
  } | null;
  infoFromDeviceIP: {
    city?: string;
    regionName?: string;
    country?: string;
  } | null;
};

export type TimConsolidatedDay = {
  id: string;
  consolidateDate: string;
  activeTime: number;
  idleTime: number;
  workingSeconds: number;
  dailyCost: number;
  firstActivity: string | null;
  lastActivity: string | null;
  actionK: number;
  actionL: number;
};

function isConfigured(): boolean {
  return Boolean(process.env.TIM_API_URL && process.env.TIM_API_KEY);
}

async function timFetch<T>(path: string, searchParams?: Record<string, string>): Promise<T | null> {
  const apiUrl = process.env.TIM_API_URL;
  const apiKey = process.env.TIM_API_KEY;
  if (!apiUrl || !apiKey) return null;

  const url = new URL(path, apiUrl.replace(/\/$/, "") + "/");
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Time is Money API respondeu ${res.status} em ${path}`);
  return (await res.json()) as T;
}

/** Lista todos os clientes (colaboradores) cadastrados na plataforma, excluindo os removidos. */
export async function listClients(): Promise<TimClient[]> {
  const data = await timFetch<TimClient[]>("clients");
  if (!data) return [];
  return data.filter((c) => !c.isDeleted);
}

/**
 * Produtividade diária consolidada de um cliente num período (dias no formato "YYYY-MM-DD").
 *
 * A API do Time is Money não filtra corretamente por `startConsolidateDate`/`endConsolidateDate`
 * (testado: retorna sempre 0 itens quando esses parâmetros são enviados, mesmo com datas válidas)
 * nem ordena os itens por data — por isso buscamos tudo do cliente (limit alto) e filtramos aqui.
 */
export async function getConsolidatedForClient(
  clientId: string,
  fromDate: string,
  toDate: string
): Promise<TimConsolidatedDay[]> {
  const data = await timFetch<{ items: TimConsolidatedDay[] }>("consolidated/client", {
    page: "1",
    limit: "500",
    clientId,
  });
  const items = data?.items ?? [];
  return items.filter((d) => d.consolidateDate >= fromDate && d.consolidateDate <= toDate);
}

/** Equipe monitorada no módulo. Faz o seed inicial na primeira leitura, se a tabela estiver vazia. */
export async function getMonitoredClients() {
  const existing = await prisma.timMonitoredClient.findMany({ orderBy: { fullName: "asc" } });
  if (existing.length > 0) return existing;

  await prisma.timMonitoredClient.createMany({
    data: TIM_TEAM_SEED,
    skipDuplicates: true,
  });
  return prisma.timMonitoredClient.findMany({ orderBy: { fullName: "asc" } });
}

export { isConfigured as isTimConfigured };
