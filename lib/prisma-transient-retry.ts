const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Erros comuns quando o Postgres ainda esta em recovery ou indisponivel por instantes. */
export function isTransientDbFailure(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? `${error.message}\n${(error as Error & { cause?: unknown }).cause ?? ""}`
      : String(error);
  if (/not yet accepting connections/i.test(msg)) return true;
  if (/consistent recovery state/i.test(msg)) return true;
  if (/can't reach database server/i.test(msg)) return true;
  if (/ECONNREFUSED/i.test(msg)) return true;
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: string }).code);
    if (code === "P1001" || code === "P1002") return true;
  }
  return false;
}

const DEFAULT_ATTEMPTS = Math.min(30, Math.max(1, Number(process.env.PRISMA_QUERY_RETRIES ?? 8)));
const DEFAULT_DELAY_MS = Math.min(10_000, Math.max(300, Number(process.env.PRISMA_QUERY_RETRY_MS ?? 1500)));

/**
 * Reexecuta a operacao em falhas transitórias de conexao (ex.: recovery do Postgres).
 */
export async function withTransientDbRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS
): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isTransientDbFailure(error) || attempt === maxAttempts) {
        throw error;
      }
      await sleep(delayMs);
    }
  }
  throw last;
}

export const TRANSIENT_DB_USER_MESSAGE =
  "O banco de dados ainda esta iniciando ou em recuperacao. Aguarde 1 a 3 minutos e tente novamente.";
