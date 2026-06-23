import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const certs = await prisma.digitalCertificate.findMany({
    include: { company: true },
    orderBy: { expiresAt: "asc" },
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 5);

  const vencidos: typeof certs = [];
  const proximos: typeof certs = [];

  for (const cert of certs) {
    const venc = new Date(cert.expiresAt);
    venc.setHours(0, 0, 0, 0);

    if (venc < hoje) {
      vencidos.push(cert);
    } else if (venc <= limite) {
      proximos.push(cert);
    }
  }

  return NextResponse.json({ vencidos, proximos });
}

export const dynamic = "force-dynamic";
