import { prisma } from "@/lib/prisma";
import { FINANCEIRO_SERVICE_NAMES } from "@/lib/financeiro-services";

const FINANCEIRO_SERVER_NAMES = Object.values(FINANCEIRO_SERVICE_NAMES);

/** Retorna o EmailServer se for um dos três serviços do financeiro; caso contrário null. */
export async function getFinanceiroEmailServerById(serverId: string) {
  return prisma.emailServer.findFirst({
    where: {
      id: serverId,
      name: { in: FINANCEIRO_SERVER_NAMES },
    },
  });
}
