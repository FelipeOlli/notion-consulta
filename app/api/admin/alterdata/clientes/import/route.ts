import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { ensureMaster } from "@/lib/admin-auth";
import type { AlterdataClienteStatus } from "@prisma/client";

const VALID_STATUS: AlterdataClienteStatus[] = ["ATIVO", "INATIVO", "INADIMPLENTE", "CONGELADO", "DISTRATADO"];

function parseStatus(raw: unknown): AlterdataClienteStatus {
  const s = String(raw ?? "").trim().toUpperCase();
  if (VALID_STATUS.includes(s as AlterdataClienteStatus)) return s as AlterdataClienteStatus;
  return "ATIVO";
}

export async function POST(request: NextRequest) {
  const isMaster = await ensureMaster();
  if (!isMaster) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ message: "Arquivo não enviado." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  if (rows.length === 0) return NextResponse.json({ message: "Planilha vazia." }, { status: 400 });

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const codPessoa = String(row["Cód. Pessoa"] ?? row["Cód. pessoa"] ?? row["cod_pessoa"] ?? "").trim();
    const nome = String(row["Nome"] ?? row["Pessoa"] ?? "").trim();

    if (!codPessoa || !nome) {
      errors.push(`Linha ignorada: código ou nome ausente (cod="${codPessoa}", nome="${nome}")`);
      continue;
    }

    const rawUnidade = row["Unidade"] ?? row["Unidades"] ?? row["unidade"];
    const data = {
      nome,
      unidade: rawUnidade ? String(rawUnidade).trim() : null,
      status: parseStatus(row["Status"]),
      qtdLicencas: Number(row["Qtd. Licenças"] ?? row["Quantidade de Licenças"] ?? 1) || 1,
      qtdUsuarios: Number(row["Qtd. Usuários"] ?? row["Quantidade de Usuários Cadastrados"] ?? 0) || 0,
      acessosFranqueado: Number(row["Acessos Franqueado"] ?? row["Acessos_Franqueado"] ?? 0) || 0,
      acessosBackoffice: Number(row["Acessos Backoffice"] ?? row["Acessos_Backoffice"] ?? 0) || 0,
      observacao: row["Observação"] ? String(row["Observação"]).trim() : null,
    };

    const existing = await prisma.alterdataCliente.findUnique({ where: { codPessoa } });
    if (existing) {
      await prisma.alterdataCliente.update({ where: { codPessoa }, data });
      updated++;
    } else {
      await prisma.alterdataCliente.create({ data: { codPessoa, ...data } });
      inserted++;
    }
  }

  return NextResponse.json({ inserted, updated, errors });
}

export const dynamic = "force-dynamic";
