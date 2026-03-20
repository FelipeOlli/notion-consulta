import { prisma } from "@/lib/prisma";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tenta conectar ao Postgres com varias tentativas.
 * Util quando o app sobe antes do banco terminar recovery (ex.: restart do Postgres no EasyPanel).
 */
export async function connectPrismaWithRetry(): Promise<void> {
  const max = Math.min(60, Math.max(1, Number(process.env.PRISMA_CONNECT_RETRIES ?? 20)));
  const delayMs = Math.min(30_000, Math.max(500, Number(process.env.PRISMA_CONNECT_RETRY_MS ?? 2000)));

  let last: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      await prisma.$connect();
      if (attempt > 1) {
        console.info(`[prisma] Conectado na tentativa ${attempt}/${max}.`);
      }
      return;
    } catch (error) {
      last = error;
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[prisma] Tentativa ${attempt}/${max} falhou: ${msg.slice(0, 200)}`);
      if (attempt < max) await sleep(delayMs);
    }
  }

  console.error("[prisma] Nao foi possivel conectar ao banco apos todas as tentativas.");
  throw last;
}
