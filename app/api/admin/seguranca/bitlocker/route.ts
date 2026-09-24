import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await ensureModuleAccess("seguranca");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const entries = await prisma.bitLockerEntry.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const ok = await ensureModuleAccess("seguranca");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const { nomeDispositivo, deviceId, codigoBitLocker } = await req.json();

  if (!nomeDispositivo?.trim() || !deviceId?.trim() || !codigoBitLocker?.trim()) {
    return NextResponse.json({ message: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const entry = await prisma.bitLockerEntry.create({
    data: {
      nomeDispositivo: nomeDispositivo.trim(),
      deviceId: deviceId.trim(),
      codigoBitLocker: codigoBitLocker.trim(),
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
