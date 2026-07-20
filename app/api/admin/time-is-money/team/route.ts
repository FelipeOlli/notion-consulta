import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isTimConfigured, listClients } from "@/lib/tim-api";

export const dynamic = "force-dynamic";

/** GET: lista clientes da API + quais já estão monitorados no módulo. */
export async function GET() {
  const ok = await ensureModuleAccess("time_is_money");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  if (!isTimConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const [clients, monitored] = await Promise.all([
      listClients(),
      prisma.timMonitoredClient.findMany(),
    ]);
    const monitoredIds = new Set(monitored.map((m) => m.clientId));

    return NextResponse.json({
      configured: true,
      clients: clients
        .filter((c) => c.isActive)
        .map((c) => ({
          clientId: c.id,
          fullName: c.fullName,
          email: c.email,
          monitored: monitoredIds.has(c.id),
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR")),
    });
  } catch {
    return NextResponse.json({ message: "Erro ao conectar à API do Time is Money." }, { status: 502 });
  }
}

/** POST: adiciona um cliente à equipe monitorada (só master). */
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ message: "Somente o administrador principal pode gerenciar a equipe." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const clientId = typeof body?.clientId === "string" ? body.clientId : null;
  const fullName = typeof body?.fullName === "string" ? body.fullName : null;
  const email = typeof body?.email === "string" ? body.email : null;
  if (!clientId || !fullName) {
    return NextResponse.json({ message: "clientId e fullName são obrigatórios." }, { status: 400 });
  }

  await prisma.timMonitoredClient.upsert({
    where: { clientId },
    update: { fullName, email },
    create: { clientId, fullName, email },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE: remove um cliente da equipe monitorada (só master). ?clientId=... */
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== "master") {
    return NextResponse.json({ message: "Somente o administrador principal pode gerenciar a equipe." }, { status: 403 });
  }

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ message: "clientId é obrigatório." }, { status: 400 });
  }

  await prisma.timMonitoredClient.deleteMany({ where: { clientId } });
  return NextResponse.json({ ok: true });
}
