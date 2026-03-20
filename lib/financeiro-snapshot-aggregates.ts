import { prisma } from "@/lib/prisma";

type PrismaDb = typeof prisma;

/** Atualiza totalUsers (e activeUsers no Google) com base nas linhas do snapshot. */
export async function recalcSnapshotLineAggregates(snapshotId: string, db: PrismaDb = prisma): Promise<void> {
  const snap = await db.serviceUserSnapshot.findUnique({ where: { id: snapshotId } });
  if (!snap) return;

  const totalUsers = await db.serviceUserSnapshotLine.count({ where: { snapshotId } });

  if (snap.source === "GOOGLE_JSON") {
    const lines = await db.serviceUserSnapshotLine.findMany({
      where: { snapshotId },
      select: { status: true },
    });
    const activeUsers = lines.filter((l) => (l.status ?? "").trim().toLowerCase() === "active").length;
    await db.serviceUserSnapshot.update({
      where: { id: snapshotId },
      data: { totalUsers, activeUsers },
    });
    return;
  }

  await db.serviceUserSnapshot.update({
    where: { id: snapshotId },
    data: { totalUsers, activeUsers: null },
  });
}
