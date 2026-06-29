import { prisma } from "@/lib/prisma";
import { searchMessages, getMessageMeta } from "@/lib/gmail";

type CheckResult = {
  sscId: string;
  numero: string;
  novasUpdates: number;
};

export async function checkSscs(sscId?: string): Promise<CheckResult[]> {
  const sscs = await prisma.dominioSsc.findMany({
    where: sscId ? { id: sscId } : { status: "ABERTA" },
    select: { id: true, numero: true },
  });

  const results: CheckResult[] = [];

  for (const ssc of sscs) {
    let novasUpdates = 0;

    try {
      const messageIds = await searchMessages(`${ssc.numero} newer_than:90d`);

      const existingIds = new Set(
        (
          await prisma.dominioSscUpdate.findMany({
            where: { sscId: ssc.id },
            select: { gmailMessageId: true },
          })
        ).map((u) => u.gmailMessageId),
      );

      const novos = messageIds.filter((id) => !existingIds.has(id));

      for (const msgId of novos) {
        const meta = await getMessageMeta(msgId);
        await prisma.dominioSscUpdate.create({
          data: {
            sscId: ssc.id,
            gmailMessageId: msgId,
            remetente: meta.remetente,
            assunto: meta.assunto,
            snippet: meta.snippet,
            receivedAt: meta.receivedAt,
            visto: false,
          },
        });
        novasUpdates++;
      }
    } catch {
      // continua para próxima SSC mesmo se uma falhar
    }

    await prisma.dominioSsc.update({
      where: { id: ssc.id },
      data: { lastCheckedAt: new Date() },
    });

    results.push({ sscId: ssc.id, numero: ssc.numero, novasUpdates });
  }

  return results;
}
