import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;

  const protocols = await prisma.ipMonitorProtocol.findMany({
    where: { monitorId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: protocols });
}

export async function POST(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { protocol, serviceOrder } = body as { protocol: string; serviceOrder: string };

    if (!protocol?.trim() || !serviceOrder?.trim()) {
      return NextResponse.json({ message: "Protocolo e Ordem de Serviço são obrigatórios." }, { status: 400 });
    }

    const record = await prisma.ipMonitorProtocol.create({
      data: { monitorId: id, protocol: protocol.trim(), serviceOrder: serviceOrder.trim() },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao registrar protocolo.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
