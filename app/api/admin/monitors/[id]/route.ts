import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  try {
    const body = await request.json();
    const { name, host, port, type, groupId, interval, active } = body as {
      name?: string;
      host?: string;
      port?: number | null;
      type?: "HTTP" | "TCP";
      groupId?: string | null;
      interval?: number;
      active?: boolean;
    };

    const monitor = await prisma.ipMonitor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(host !== undefined && { host: host.trim() }),
        ...(port !== undefined && { port }),
        ...(type !== undefined && { type }),
        ...(groupId !== undefined && { groupId: groupId || null }),
        ...(interval !== undefined && { interval }),
        ...(active !== undefined && { active }),
      },
      include: { group: true },
    });

    return NextResponse.json({ data: monitor });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar monitor.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  await prisma.ipMonitor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
