import { NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const session = await getAdminSession();
  if (session?.role !== "master")
    return NextResponse.json({ message: "Apenas master pode editar cores." }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const color = await prisma.transbordoBadgeColor.update({
    where: { id: Number(id) },
    data: {
      ...(body.label !== undefined && { label: body.label }),
      ...(body.hexValue !== undefined && { hexValue: body.hexValue }),
    },
  });

  return NextResponse.json(color);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ok = await ensureModuleAccess("transbordo");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const session = await getAdminSession();
  if (session?.role !== "master")
    return NextResponse.json({ message: "Apenas master pode excluir cores." }, { status: 403 });

  const { id } = await params;
  await prisma.transbordoBadgeColor.delete({ where: { id: Number(id) } });

  return NextResponse.json({ ok: true });
}
