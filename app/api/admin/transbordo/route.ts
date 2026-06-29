import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const tickets = await prisma.transbordoTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { comments: true } },
      statusColor: true,
    },
  });

  return NextResponse.json(tickets);
}

export async function POST(req: Request) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const body = await req.json();

  const ticket = await prisma.transbordoTicket.create({
    data: {
      franchiseName: body.franchiseName ?? "",
      sistemaOrigem: body.sistemaOrigem ?? null,
      systems: body.systems ?? [],
      status: body.status ?? "T0 - Coleta inicial de dados",
      statusColorId: body.statusColorId ? Number(body.statusColorId) : null,
      progress: body.progress ? Number(body.progress) : 0,
      companies: body.companies ? Number(body.companies) : null,
      request: body.request ?? null,
      ticketTransbordoNo: body.ticketTransbordoNo ?? null,
      lembrete: body.lembrete ?? null,
      agendado: body.agendado ?? null,
      solicitacao: body.solicitacao ?? null,
      ssc: body.ssc ?? null,
      tempoMigracao: body.tempoMigracao ?? null,
      totalDays: body.totalDays ? Number(body.totalDays) : null,
      prevDays: body.prevDays ? Number(body.prevDays) : null,
      workDays: body.workDays ? Number(body.workDays) : null,
      dConcluido: body.dConcluido ? new Date(body.dConcluido) : null,
    },
    include: {
      _count: { select: { comments: true } },
      statusColor: true,
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
