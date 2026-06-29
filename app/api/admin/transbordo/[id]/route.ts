import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const ticket = await prisma.transbordoTicket.update({
    where: { id },
    data: {
      ...(body.franchiseName !== undefined && { franchiseName: body.franchiseName }),
      ...(body.sistemaOrigem !== undefined && { sistemaOrigem: body.sistemaOrigem }),
      ...(body.systems !== undefined && { systems: body.systems }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.statusColorId !== undefined && {
        statusColorId: body.statusColorId ? Number(body.statusColorId) : null,
      }),
      ...(body.progress !== undefined && { progress: Number(body.progress) }),
      ...(body.companies !== undefined && {
        companies: body.companies ? Number(body.companies) : null,
      }),
      ...(body.request !== undefined && { request: body.request }),
      ...(body.ticketTransbordoNo !== undefined && {
        ticketTransbordoNo: body.ticketTransbordoNo,
      }),
      ...(body.lembrete !== undefined && { lembrete: body.lembrete }),
      ...(body.agendado !== undefined && { agendado: body.agendado }),
      ...(body.solicitacao !== undefined && { solicitacao: body.solicitacao }),
      ...(body.ssc !== undefined && { ssc: body.ssc }),
      ...(body.tempoMigracao !== undefined && { tempoMigracao: body.tempoMigracao }),
      ...(body.totalDays !== undefined && {
        totalDays: body.totalDays ? Number(body.totalDays) : null,
      }),
      ...(body.prevDays !== undefined && {
        prevDays: body.prevDays ? Number(body.prevDays) : null,
      }),
      ...(body.workDays !== undefined && {
        workDays: body.workDays ? Number(body.workDays) : null,
      }),
      ...(body.dConcluido !== undefined && {
        dConcluido: body.dConcluido ? new Date(body.dConcluido) : null,
      }),
    },
    include: {
      _count: { select: { comments: true } },
      statusColor: true,
    },
  });

  return NextResponse.json(ticket);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;
  await prisma.transbordoTicket.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
