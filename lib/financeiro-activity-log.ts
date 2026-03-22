import type { FinanceiroActivityAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

/**
 * Grava auditoria do módulo Financeiro. Falhas são logadas no console e não interrompem a operação principal.
 */
export async function logFinanceiroActivity(input: {
  action: FinanceiroActivityAction;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    const session = await getAdminSession();
    const actorEmail = session?.email?.trim() || "unknown";
    const actorUserId = session?.userId?.trim() || null;

    await prisma.financeiroActivityLog.create({
      data: {
        actorEmail,
        actorUserId,
        action: input.action,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
    });
  } catch (e) {
    console.error("[financeiro-activity-log]", e);
  }
}
