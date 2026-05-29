import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureMaster } from "@/lib/admin-auth";
import type { AlterdataClienteStatus } from "@prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  const body = await request.json();
  const { codPessoa, nome, status, qtdLicencas, qtdUsuarios, licencasOciosas, acessosFranqueado, acessosBackoffice, observacao } = body;

  const data: Record<string, unknown> = {};
  if (codPessoa !== undefined) data.codPessoa = String(codPessoa).trim();
  if (nome !== undefined) data.nome = String(nome).trim();
  if (status !== undefined) data.status = status as AlterdataClienteStatus;
  if (qtdLicencas !== undefined) data.qtdLicencas = Number(qtdLicencas);
  if (qtdUsuarios !== undefined) data.qtdUsuarios = Number(qtdUsuarios);
  if (licencasOciosas !== undefined) data.licencasOciosas = Number(licencasOciosas);
  if (acessosFranqueado !== undefined) data.acessosFranqueado = Number(acessosFranqueado);
  if (acessosBackoffice !== undefined) data.acessosBackoffice = Number(acessosBackoffice);
  if (observacao !== undefined) data.observacao = observacao ? String(observacao).trim() : null;

  const cliente = await prisma.alterdataCliente.update({ where: { id: params.id }, data });
  return NextResponse.json(cliente);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  await prisma.alterdataCliente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
