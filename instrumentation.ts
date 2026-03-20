/**
 * Executado uma vez na inicializacao do runtime Node (producao e dev).
 * Ver: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_PRISMA_CONNECT_RETRY === "1") return;

  try {
    const { connectPrismaWithRetry } = await import("@/lib/prisma-connect-retry");
    await connectPrismaWithRetry();
  } catch (error) {
    // Nao derrubar o processo: a home e rotas sem DB podem responder; Prisma tentara de novo na primeira query.
    console.error(
      "[instrumentation] Falha ao conectar ao Postgres na subida. O app segue no ar; verifique DATABASE_URL e o banco.",
      error
    );
  }
}
