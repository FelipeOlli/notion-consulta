import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const total = await prisma.dominioSscUpdate.count({
    where: { visto: false, ssc: { status: "ABERTA" } },
  });

  return NextResponse.json({ total });
}

export async function PATCH() {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  await prisma.dominioSscUpdate.updateMany({
    where: { visto: false, ssc: { status: "ABERTA" } },
    data: { visto: true },
  });

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
