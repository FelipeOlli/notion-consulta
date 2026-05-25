import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const { id } = await params;
  const { searchParams } = request.nextUrl;

  const rawLimit = Number(searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(1, rawLimit), 200);
  const statusFilter = searchParams.get("status");

  const events = await prisma.ipMonitorEvent.findMany({
    where: {
      monitorId: id,
      ...(statusFilter ? { status: statusFilter as "UP" | "DOWN" | "PENDING" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, status: true, ping: true, message: true, createdAt: true },
  });

  return NextResponse.json({ data: events });
}

export const dynamic = "force-dynamic";
