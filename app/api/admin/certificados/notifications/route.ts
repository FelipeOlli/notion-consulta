import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("certificados");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const [certs, reads] = await Promise.all([
    prisma.digitalCertificate.findMany({
      include: { company: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.notificationRead.findMany({ where: { kind: "certificado" } }),
  ]);

  const readSet = new Set(reads.map((r) => r.refId));

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 5);

  const vencidos: (typeof certs[0] & { lido: boolean })[] = [];
  const proximos: (typeof certs[0] & { lido: boolean })[] = [];

  for (const cert of certs) {
    const venc = new Date(cert.expiresAt);
    venc.setHours(0, 0, 0, 0);

    if (venc < hoje) {
      vencidos.push({ ...cert, lido: readSet.has(cert.id) });
    } else if (venc <= limite) {
      proximos.push({ ...cert, lido: readSet.has(cert.id) });
    }
  }

  return NextResponse.json({ vencidos, proximos });
}

export const dynamic = "force-dynamic";
