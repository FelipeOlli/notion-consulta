import { NextRequest, NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/admin-auth";
import { createLink, listAdminLinks } from "@/lib/store";

export async function GET() {
  const ok = await ensureAdmin();
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const data = await listAdminLinks();
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const ok = await ensureAdmin();
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const body = await request.json();
    const created = await createLink(body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel criar o link.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
