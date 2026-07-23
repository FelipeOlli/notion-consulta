import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const options = await prisma.transbordoSistemaOrigemOption.findMany({
    orderBy: { label: "asc" },
  });
  return NextResponse.json(options);
}

export async function POST(req: Request) {
  const ok = await ensureModuleAccess("dominio");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const session = await getAdminSession();
  if (session?.role !== "master")
    return NextResponse.json(
      { message: "Apenas master pode criar opções de sistema de origem." },
      { status: 403 }
    );

  const body = await req.json();
  if (!body.label)
    return NextResponse.json({ message: "label é obrigatório." }, { status: 400 });

  const opt = await prisma.transbordoSistemaOrigemOption.create({
    data: {
      label: body.label.trim(),
    },
  });

  return NextResponse.json(opt, { status: 201 });
}
