import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess, ensureMaster } from "@/lib/admin-auth";
import type { AlterdataClienteStatus, AlterdataTelemetria } from "@prisma/client";

export async function GET() {
  const ok = await ensureModuleAccess("alterdata");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const clientes = await prisma.alterdataCliente.findMany({
    orderBy: [{ status: "asc" }, { nome: "asc" }],
  });
  return NextResponse.json(clientes);
}

export async function POST(request: NextRequest) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  const body = await request.json();
  const { codPessoa, nome, unidade, cnpj, status, telemetria, qtdLicencas, acessosFranqueado, acessosBackoffice, observacao } = body;

  if (!codPessoa || !nome) {
    return NextResponse.json({ message: "Código e nome são obrigatórios." }, { status: 400 });
  }

  const cliente = await prisma.alterdataCliente.create({
    data: {
      codPessoa: String(codPessoa).trim(),
      nome: String(nome).trim(),
      unidade: unidade ? String(unidade).trim() : null,
      cnpj: cnpj ? String(cnpj).replace(/\D/g, "") || null : null,
      status: (status as AlterdataClienteStatus) ?? "ATIVO",
      telemetria: (telemetria as AlterdataTelemetria) ?? null,
      qtdLicencas: Number(qtdLicencas) || 1,
      acessosFranqueado: Number(acessosFranqueado) || 0,
      acessosBackoffice: Number(acessosBackoffice) || 0,
      observacao: observacao ? String(observacao).trim() : null,
    },
  });

  return NextResponse.json(cliente, { status: 201 });
}

export const dynamic = "force-dynamic";
