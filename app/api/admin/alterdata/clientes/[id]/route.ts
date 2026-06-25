import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMaster } from "@/lib/admin-auth";
import type { AlterdataClienteStatus, AlterdataTelemetria } from "@prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { codPessoa, nome, unidade, cnpj, cpf, status, telemetria, qtdLicencas, acessosFranqueado, acessosBackoffice, acessoLiberado, observacao } = body;

  const data: Record<string, unknown> = {};
  if (codPessoa !== undefined) data.codPessoa = String(codPessoa).trim();
  if (nome !== undefined) data.nome = String(nome).trim();
  if (unidade !== undefined) data.unidade = unidade ? String(unidade).trim() : null;
  if (cnpj !== undefined) data.cnpj = cnpj ? String(cnpj).replace(/\D/g, "") || null : null;
  if (cpf !== undefined) data.cpf = cpf ? String(cpf).replace(/\D/g, "") || null : null;
  if (status !== undefined) data.status = status as AlterdataClienteStatus;
  if (telemetria !== undefined) data.telemetria = (telemetria || null) as AlterdataTelemetria | null;
  if (qtdLicencas !== undefined) data.qtdLicencas = Number(qtdLicencas);
  if (acessosFranqueado !== undefined) data.acessosFranqueado = Number(acessosFranqueado);
  if (acessosBackoffice !== undefined) data.acessosBackoffice = Number(acessosBackoffice);
  if (acessoLiberado !== undefined) data.acessoLiberado = Boolean(acessoLiberado);
  if (observacao !== undefined) data.observacao = observacao ? String(observacao).trim() : null;

  try {
    const cliente = await prisma.alterdataCliente.update({ where: { id }, data });
    return NextResponse.json(cliente);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar cliente.";
    if (/Unique constraint/i.test(message)) {
      return NextResponse.json({ message: "Já existe cliente com este código." }, { status: 409 });
    }
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  const { id } = await params;
  await prisma.alterdataCliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
