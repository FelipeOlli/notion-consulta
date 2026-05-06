import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const groups = await prisma.ipMonitorGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { monitors: true } } },
  });

  return NextResponse.json({ data: groups });
}

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const body = await request.json();
  const { name } = body as { name: string };
  if (!name?.trim()) return NextResponse.json({ message: "Nome e obrigatorio." }, { status: 400 });

  const group = await prisma.ipMonitorGroup.create({
    data: { name: name.trim() },
  });

  return NextResponse.json({ data: group }, { status: 201 });
}

export const dynamic = "force-dynamic";
