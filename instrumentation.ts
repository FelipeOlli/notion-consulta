/**
 * Executado uma vez na inicializacao do runtime Node (producao e dev).
 * Ver: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_PRISMA_CONNECT_RETRY === "1") return;

  const { connectPrismaWithRetry } = await import("@/lib/prisma-connect-retry");
  await connectPrismaWithRetry();
}
