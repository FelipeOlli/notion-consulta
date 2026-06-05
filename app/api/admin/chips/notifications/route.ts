import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("chips");
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const chips = await prisma.chip.findMany({ include: { empresa: true } });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em3dias = new Date(hoje);
  em3dias.setDate(em3dias.getDate() + 3);

  const vencidos: typeof chips = [];
  const proximos: typeof chips = [];

  for (const chip of chips) {
    const vencimento = new Date(chip.ultimaRecarga);
    vencimento.setDate(vencimento.getDate() + chip.duracaoDias);
    vencimento.setHours(0, 0, 0, 0);

    if (vencimento < hoje) {
      vencidos.push(chip);
    } else if (vencimento <= em3dias) {
      proximos.push(chip);
    }
  }

  return NextResponse.json({ vencidos, proximos });
}
