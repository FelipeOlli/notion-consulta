import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { certificadosMutationGuard, ensureModuleAccess } from "@/lib/admin-auth";

const MAX_LEGAL_NAME = 512;

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });
  const denied = await certificadosMutationGuard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON invalido." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Corpo invalido." }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const legalName = String(o.legalName ?? "").trim().slice(0, MAX_LEGAL_NAME);
  if (!legalName) {
    return NextResponse.json({ message: "Razao social obrigatoria." }, { status: 400 });
  }
  const documentRaw = String(o.document ?? "").trim();
  const document = documentRaw ? documentRaw.slice(0, 64) : null;
  const partnerNameRaw = String(o.partnerName ?? "").trim();
  const partnerName = partnerNameRaw ? partnerNameRaw.slice(0, 255) : null;

  try {
    const created = await prisma.company.create({
      data: { legalName, document, partnerName },
      select: { id: true, legalName: true, document: true, partnerName: true },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    if (raw.includes("Unique constraint") || /Unique constraint/i.test(raw)) {
      return NextResponse.json({ message: "Ja existe empresa com este CPF/CNPJ." }, { status: 409 });
    }
    return NextResponse.json({ message: raw || "Erro ao criar empresa." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
