import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await ensureModuleAccess("iungo"))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const ramais = await prisma.iungoRamal.findMany({
    orderBy: { ramal: "asc" },
  });

  return NextResponse.json(ramais);
}

export async function POST(req: Request) {
  if (!(await ensureModuleAccess("iungo"))) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { ramal, status, login, senha, numero, funcionarios } = body;

  if (!ramal || !login || !senha) {
    return NextResponse.json({ message: "Ramal, login e senha são obrigatórios." }, { status: 400 });
  }

  const novo = await prisma.iungoRamal.create({
    data: {
      ramal: String(ramal).trim(),
      status: status ?? "ATIVO",
      login: String(login).trim(),
      senha: String(senha).trim(),
      numero: numero ? String(numero).trim() : null,
      funcionarios: Array.isArray(funcionarios) ? funcionarios.map(String) : [],
    },
  });

  return NextResponse.json(novo, { status: 201 });
}
