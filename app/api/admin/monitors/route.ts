import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const monitors = await prisma.ipMonitor.findMany({
    include: {
      group: true,
      events: {
        where: { status: "DOWN" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const data = monitors.map(({ events, ...m }) => ({
    ...m,
    lastDownAt: events[0]?.createdAt ?? null,
  }));

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const { name, host, port, type, groupId, interval } = body as {
      name: string;
      host: string;
      port?: number;
      type?: "HTTP" | "TCP";
      groupId?: string;
      interval?: number;
    };

    if (!name?.trim() || !host?.trim()) {
      return NextResponse.json({ message: "Nome e host sao obrigatorios." }, { status: 400 });
    }

    const monitor = await prisma.ipMonitor.create({
      data: {
        name: name.trim(),
        host: host.trim(),
        port: port ?? null,
        type: type === "TCP" ? "TCP" : "HTTP",
        groupId: groupId || null,
        interval: interval ?? 60,
      },
      include: { group: true },
    });

    return NextResponse.json({ data: monitor }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel criar monitor.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
