import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { id } = await params;

  const comment = await prisma.transbordoComment.findUnique({
    where: { id },
    select: { ticketId: true },
  });

  if (comment) {
    await prisma.transbordoComment.delete({ where: { id } });

    const lastComment = await prisma.transbordoComment.findFirst({
      where: { ticketId: comment.ticketId },
      orderBy: { createdAt: "desc" },
    });

    const ticket = await prisma.transbordoTicket.findUnique({
      where: { id: comment.ticketId },
      select: { createdAt: true },
    });

    const newUpdatedAt = lastComment ? lastComment.createdAt : (ticket?.createdAt ?? new Date());

    await prisma.transbordoTicket.update({
      where: { id: comment.ticketId },
      data: { updatedAt: newUpdatedAt },
    });

    return NextResponse.json({ ok: true, newUpdatedAt });
  }

  return NextResponse.json({ ok: true });
}
