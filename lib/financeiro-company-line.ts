import { prisma } from "@/lib/prisma";

export async function financeiroCompanyForServer(companyId: string, serverId: string) {
  return prisma.financeiroServerCompany.findFirst({
    where: { id: companyId, serverId },
    select: { id: true, name: true },
  });
}
