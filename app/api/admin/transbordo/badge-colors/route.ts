import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const colors = await prisma.transbordoBadgeColor.findMany({ orderBy: { label: "asc" } });
  return NextResponse.json(colors);
}

export async function POST(req: Request) {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const session = await getAdminSession();
  if (session?.role !== "master")
    return NextResponse.json({ message: "Apenas master pode criar cores." }, { status: 403 });

  const body = await req.json();
  if (!body.label || !body.hexValue)
    return NextResponse.json({ message: "label e hexValue são obrigatórios." }, { status: 400 });

  const color = await prisma.transbordoBadgeColor.create({
    data: { label: body.label, hexValue: body.hexValue },
  });

  return NextResponse.json(color, { status: 201 });
}
