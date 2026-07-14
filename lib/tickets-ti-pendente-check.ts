import { prisma } from "@/lib/prisma";

const SCHEDULE_NAME = "tickets_ti_pendente_check";
const INTERVAL_MS = 5 * 60 * 1000; // 5min — janela mínima entre checagens
const CHECK_MS = 5 * 60 * 1000; // 5min — frequência de verificação
const INITIAL_DELAY_MS = 30 * 1000;

type ScrumHubTicket = {
  id: number;
  nome: string;
  status_nome: string | null;
  nome_solicitante: string | null;
  responsavel_nome: string | null;
  projeto_nome: string | null;
};

let started = false;

function gerarSlug(nome: string): string {
  return (nome ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

async function checarTicketsPendentes() {
  const apiUrl = process.env.SCRUMHUB_API_URL;
  const apiKey = process.env.SCRUMHUB_API_KEY;
  const projetoId = process.env.SCRUMHUB_PROJETO_ID;
  if (!apiUrl || !apiKey || !projetoId) return;

  const [res, resExternos] = await Promise.all([
    fetch(`${apiUrl}/tickets-pai/projeto/${projetoId}/all?aprovado=1`, {
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      cache: "no-store",
    }),
    // Tickets Externos: pedidos ainda não aprovados, ficam fora de aprovado=1
    fetch(`${apiUrl}/tickets-pai/projeto/${projetoId}/all?aprovado=0`, {
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      cache: "no-store",
    }),
  ]);
  if (!res.ok) throw new Error(`ScrumHub respondeu ${res.status}`);

  const [json, jsonExternos] = await Promise.all([
    res.json(),
    resExternos.ok ? resExternos.json() : Promise.resolve({ data: [] }),
  ]);
  const todos: ScrumHubTicket[] = [...(json?.data ?? []), ...(jsonExternos?.data ?? [])];
  const frontendBase = apiUrl.replace(/\/$/, "");

  const pendentes = todos.filter((t) => (t.status_nome ?? "").toLowerCase().includes("pendente"));

  for (const t of pendentes) {
    const ticketSlug = `${gerarSlug(t.nome)}-${t.id}`;
    const projetoSlug = gerarSlug(t.projeto_nome ?? "");
    await prisma.ticketTiPendenteAlerta.upsert({
      where: { ticketId: t.id },
      update: {},
      create: {
        ticketId: t.id,
        nome: t.nome,
        solicitante: t.nome_solicitante ?? "",
        responsavel: t.responsavel_nome ?? "",
        statusNome: t.status_nome ?? "",
        url: `${frontendBase}/ticket/${ticketSlug}?slug=${projetoSlug}`,
      },
    });
  }
}

async function tryRun() {
  const janela = new Date(Date.now() - INTERVAL_MS);

  // Claim atômico: só uma réplica consegue "ganhar" a linha por ciclo,
  // graças ao row-lock do UPDATE condicional no Postgres.
  const claim = await prisma.syncSchedule.updateMany({
    where: { name: SCHEDULE_NAME, OR: [{ lastRunAt: null }, { lastRunAt: { lt: janela } }] },
    data: { lastRunAt: new Date() },
  });

  if (claim.count === 0) return;

  try {
    await checarTicketsPendentes();
  } catch (error) {
    console.error("[tickets-ti-pendente-check] falha ao verificar pendentes", error);
  }
}

export function startTicketsTiPendenteCheck() {
  if (started) return;
  if (!process.env.SCRUMHUB_API_URL || !process.env.SCRUMHUB_API_KEY || !process.env.SCRUMHUB_PROJETO_ID) {
    return;
  }
  started = true;

  prisma.syncSchedule
    .upsert({ where: { name: SCHEDULE_NAME }, create: { name: SCHEDULE_NAME }, update: {} })
    .catch((error) => console.error("[tickets-ti-pendente-check] falha ao inicializar schedule", error));

  setTimeout(() => {
    tryRun().catch((error) => console.error("[tickets-ti-pendente-check] falha no disparo inicial", error));
    setInterval(() => {
      tryRun().catch((error) => console.error("[tickets-ti-pendente-check] falha no tick", error));
    }, CHECK_MS);
  }, INITIAL_DELAY_MS);
}
