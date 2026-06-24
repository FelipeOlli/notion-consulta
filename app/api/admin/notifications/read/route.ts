import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/admin-auth";

const VALID_KINDS = ["chip", "certificado"] as const;
type Kind = (typeof VALID_KINDS)[number];

export async function POST(req: NextRequest) {
  const ok = await ensureAdmin();
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const body = await req.json() as { kind?: unknown; refId?: unknown };
  const kind = body.kind;
  const refId = body.refId;

  if (typeof kind !== "string" || !(VALID_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ message: "kind inválido." }, { status: 400 });
  }
  if (typeof refId !== "string" || !refId) {
    return NextResponse.json({ message: "refId inválido." }, { status: 400 });
  }

  await prisma.notificationRead.upsert({
    where: { kind_refId: { kind: kind as Kind, refId } },
    create: { kind: kind as Kind, refId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
