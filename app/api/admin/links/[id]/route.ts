import { NextRequest, NextResponse } from "next/server";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { removeLink, updateLink } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = await params;
    const updated = await updateLink(id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar o link.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    await removeLink(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel excluir o link.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
