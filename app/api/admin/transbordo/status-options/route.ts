import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const options = await prisma.transbordoStatusOption.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(options);
}

export async function POST(req: Request) {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const session = await getAdminSession();
  if (session?.role !== "master")
    return NextResponse.json(
      { message: "Apenas master pode criar opções de status." },
      { status: 403 }
    );

  const body = await req.json();
  if (!body.label)
    return NextResponse.json({ message: "label é obrigatório." }, { status: 400 });

  const opt = await prisma.transbordoStatusOption.create({
    data: {
      label: body.label,
      value: body.value ?? null,
      sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
      isActive: body.isActive !== false,
    },
  });

  return NextResponse.json(opt, { status: 201 });
}
