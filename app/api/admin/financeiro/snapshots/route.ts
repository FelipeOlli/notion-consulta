import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { FINANCEIRO_SERVICE_NAMES, FINANCEIRO_SERVICE_KEYS } from "@/lib/financeiro-services";

function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const monthsParam = request.nextUrl.searchParams.get("months");
  const monthsBack = Math.min(36, Math.max(1, Number(monthsParam) || 18));

  const servers = await prisma.emailServer.findMany({
    where: {
      name: {
        in: [
          FINANCEIRO_SERVICE_NAMES.cfCom,
          FINANCEIRO_SERVICE_NAMES.cfComBr,
          FINANCEIRO_SERVICE_NAMES.timeIsMoney,
        ],
      },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const monthStarts: Date[] = [];
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthStarts.push(d);
  }
  const oldest = monthStarts[monthStarts.length - 1]!;

  const snapshots = await prisma.serviceUserSnapshot.findMany({
    where: {
      competence: { gte: oldest },
      serverId: { in: servers.map((s) => s.id) },
    },
    include: { server: true },
    orderBy: [{ competence: "asc" }, { server: { name: "asc" } }],
  });

  const byMonthServer = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    byMonthServer.set(`${s.serverId}:${monthKey(s.competence)}`, s);
  }

  const labels = [...monthStarts].reverse().map((d) => monthKey(d));

  const series = FINANCEIRO_SERVICE_KEYS.map((key) => {
    const server = servers.find((srv) => srv.name === FINANCEIRO_SERVICE_NAMES[key]);
    const name = FINANCEIRO_SERVICE_NAMES[key];
    const values = labels.map((label) => {
      if (!server) return null;
      const snap = byMonthServer.get(`${server.id}:${label}`);
      if (!snap) return null;
      return {
        totalUsers: snap.totalUsers,
        activeUsers: snap.activeUsers,
        snapshotId: snap.id,
        updatedAt: snap.createdAt.toISOString(),
      };
    });
    return { key, name, serverId: server?.id ?? null, values };
  });

  const latestByService = FINANCEIRO_SERVICE_KEYS.map((key) => {
    const server = servers.find((srv) => srv.name === FINANCEIRO_SERVICE_NAMES[key]);
    if (!server) return { key, name: FINANCEIRO_SERVICE_NAMES[key], latest: null };
    const last = snapshots.filter((s) => s.serverId === server.id).sort((a, b) => b.competence.getTime() - a.competence.getTime())[0];
    return {
      key,
      name: FINANCEIRO_SERVICE_NAMES[key],
      latest: last
        ? {
            competence: monthKey(last.competence),
            totalUsers: last.totalUsers,
            activeUsers: last.activeUsers,
            importedAt: last.createdAt.toISOString(),
          }
        : null,
    };
  });

  return NextResponse.json({
    data: {
      labels,
      series,
      latestByService,
      servers: servers.map((s) => ({ id: s.id, name: s.name })),
    },
  });
}

export const dynamic = "force-dynamic";
