import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getConsolidatedForClient, getMonitoredClients, isTimConfigured, listClients } from "@/lib/tim-api";

export const dynamic = "force-dynamic";

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutos

/** Data no formato "YYYY-MM-DD" (mesmo formato de `consolidateDate`), N dias atrás. */
function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const ok = await ensureModuleAccess("time_is_money");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  if (!isTimConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? dateDaysAgo(13);
  const to = searchParams.get("to") ?? dateDaysAgo(0);

  try {
    const monitored = await getMonitoredClients();
    if (monitored.length === 0) {
      return NextResponse.json({ configured: true, team: [] });
    }

    const [clients, ...consolidated] = await Promise.all([
      listClients(),
      ...monitored.map((m) => getConsolidatedForClient(m.clientId, from, to)),
    ]);

    const clientsById = new Map(clients.map((c) => [c.id, c]));
    const now = Date.now();

    const team = monitored.map((m, i) => {
      const client = clientsById.get(m.clientId) ?? null;
      const days = [...consolidated[i]].sort((a, b) => a.consolidateDate.localeCompare(b.consolidateDate));

      const lastActivity = days.reduce<string | null>((acc, d) => {
        if (!d.lastActivity) return acc;
        if (!acc || d.lastActivity > acc) return d.lastActivity;
        return acc;
      }, null);

      const online = lastActivity ? now - new Date(lastActivity).getTime() < ONLINE_THRESHOLD_MS : false;

      const totals = days.reduce(
        (acc, d) => ({
          activeTime: acc.activeTime + (d.activeTime ?? 0),
          idleTime: acc.idleTime + (d.idleTime ?? 0),
          dailyCost: acc.dailyCost + (d.dailyCost ?? 0),
        }),
        { activeTime: 0, idleTime: 0, dailyCost: 0 }
      );

      // A plataforma registra um dia mesmo sem atividade (ex.: fim de semana, zerado); usamos o
      // último dia com atividade real como resumo do card, não necessariamente o dia calendário atual.
      const daysWithActivity = days.filter((d) => d.activeTime > 0 || d.idleTime > 0);
      const latestDay =
        daysWithActivity.length > 0
          ? daysWithActivity[daysWithActivity.length - 1]
          : days.length > 0
            ? days[days.length - 1]
            : null;

      return {
        clientId: m.clientId,
        fullName: m.fullName,
        email: m.email,
        online,
        lastActivity,
        machineName: client?.deviceInfoHistory?.machineName ?? null,
        publicIP: client?.deviceInfoHistory?.publicIP ?? null,
        city: client?.infoFromDeviceIP?.city ?? null,
        region: client?.infoFromDeviceIP?.regionName ?? null,
        latestDay: latestDay
          ? {
              date: latestDay.consolidateDate,
              activeTime: latestDay.activeTime,
              idleTime: latestDay.idleTime,
              dailyCost: latestDay.dailyCost,
            }
          : null,
        totals,
        days: days.map((d) => ({
          date: d.consolidateDate,
          activeTime: d.activeTime,
          idleTime: d.idleTime,
          dailyCost: d.dailyCost,
          actionK: d.actionK,
          actionL: d.actionL,
        })),
      };
    });

    return NextResponse.json({ configured: true, from, to, team });
  } catch {
    return NextResponse.json({ message: "Erro ao conectar à API do Time is Money." }, { status: 502 });
  }
}
