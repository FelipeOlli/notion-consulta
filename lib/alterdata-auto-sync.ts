import { prisma } from "@/lib/prisma";
import { syncAlterdataFromSheet } from "@/lib/alterdata-sheets-sync";

const SCHEDULE_NAME = "alterdata";
const INTERVAL_MS = 60 * 60 * 1000; // 1h — janela mínima entre sincronizações
const CHECK_MS = 10 * 60 * 1000; // 10min — frequência de verificação
const INITIAL_DELAY_MS = 30 * 1000;

let started = false;

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
    const result = await syncAlterdataFromSheet();
    console.log(
      `[alterdata-auto-sync] inseridos=${result.inserted} atualizados=${result.updated} inalterados=${result.unchanged} ignorados=${result.skipped}`
    );
  } catch (error) {
    console.error("[alterdata-auto-sync] falha ao sincronizar", error);
  }
}

export function startAlterdataAutoSync() {
  if (started) return;
  if (!process.env.ALTERDATA_SHEET_ID || !process.env.GOOGLE_SA_CLIENT_EMAIL || !process.env.GOOGLE_SA_PRIVATE_KEY) {
    return;
  }
  started = true;

  prisma.syncSchedule
    .upsert({ where: { name: SCHEDULE_NAME }, create: { name: SCHEDULE_NAME }, update: {} })
    .catch((error) => console.error("[alterdata-auto-sync] falha ao inicializar schedule", error));

  setTimeout(() => {
    tryRun().catch((error) => console.error("[alterdata-auto-sync] falha no disparo inicial", error));
    setInterval(() => {
      tryRun().catch((error) => console.error("[alterdata-auto-sync] falha no tick", error));
    }, CHECK_MS);
  }, INITIAL_DELAY_MS);
}
