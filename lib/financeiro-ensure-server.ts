import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  FINANCEIRO_SERVICE_KEYS,
  type FinanceiroServiceKey,
  serverNameForKey,
} from "@/lib/financeiro-services";

const DEFAULT_COST = "0.000001";

/** Garante que o EmailServer do dashboard existe (mesmos dados do seed). */
export async function ensureFinanceiroEmailServer(key: FinanceiroServiceKey) {
  const name = serverNameForKey(key);
  const requiresCollaboratorEmail = key !== "timeIsMoney";

  return prisma.emailServer.upsert({
    where: { name },
    create: {
      name,
      costPerEmail: new Prisma.Decimal(DEFAULT_COST),
      requiresCollaboratorEmail,
      active: true,
    },
    update: {
      requiresCollaboratorEmail,
      active: true,
    },
  });
}

export async function ensureAllFinanceiroEmailServers() {
  const results = await Promise.all(FINANCEIRO_SERVICE_KEYS.map((k) => ensureFinanceiroEmailServer(k)));
  return results;
}
