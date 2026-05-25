import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function financeiroCompanyForServer(companyId: string, serverId: string) {
  return prisma.financeiroServerCompany.findFirst({
    where: { id: companyId, serverId },
    select: { id: true, name: true },
  });
}

/** Garante que todas as empresas da lista existem para o servidor, criando as ausentes. */
export async function ensureCompaniesForServer(
  tx: Prisma.TransactionClient,
  serverId: string,
  names: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(
    new Set(names.map((n) => n.trim()).filter((n) => n && n !== "Sem unidade"))
  );
  if (unique.length === 0) return new Map();

  await tx.financeiroServerCompany.createMany({
    data: unique.map((name) => ({ serverId, name })),
    skipDuplicates: true,
  });

  const all = await tx.financeiroServerCompany.findMany({
    where: { serverId, name: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(all.map((c) => [c.name, c.id]));
}
