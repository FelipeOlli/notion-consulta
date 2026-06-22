import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMaster } from "@/lib/admin-auth";
import type { AlterdataClienteStatus, AlterdataTelemetria } from "@prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { codPessoa, nome, unidade, cnpj, status, telemetria, qtdLicencas, acessosFranqueado, acessosBackoffice, observacao } = body;

  const data: Record<string, unknown> = {};
  if (codPessoa !== undefined) data.codPessoa = String(codPessoa).trim();
  if (nome !== undefined) data.nome = String(nome).trim();
  if (unidade !== undefined) data.unidade = unidade ? String(unidade).trim() : null;
  if (cnpj !== undefined) data.cnpj = cnpj ? String(cnpj).replace(/\D/g, "") || null : null;
  if (status !== undefined) data.status = status as AlterdataClienteStatus;
  if (telemetria !== undefined) data.telemetria = (telemetria || null) as AlterdataTelemetria | null;
  if (qtdLicencas !== undefined) data.qtdLicencas = Number(qtdLicencas);
  if (acessosFranqueado !== undefined) data.acessosFranqueado = Number(acessosFranqueado);
  if (acessosBackoffice !== undefined) data.acessosBackoffice = Number(acessosBackoffice);
  if (observacao !== undefined) data.observacao = observacao ? String(observacao).trim() : null;

  const cliente = await prisma.alterdataCliente.update({ where: { id }, data });
  return NextResponse.json(cliente);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  const { id } = await params;
  await prisma.alterdataCliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
