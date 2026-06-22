import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { ensureMaster } from "@/lib/admin-auth";
import { mapClienteRow } from "@/lib/alterdata-sheets-sync";

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

  for (const rawRow of rows) {
    // Converte valores para string para o mapper compartilhado
    const row: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawRow)) {
      row[k] = String(v ?? "");
    }

    const mapped = mapClienteRow(row);

    if (!mapped.codPessoa || !mapped.nome) {
      errors.push(
        `Linha ignorada: código ou nome ausente (cod="${mapped.codPessoa}", nome="${mapped.nome}")`
      );
      continue;
    }

    const data = {
      nome: mapped.nome,
      unidade: mapped.unidade,
      cnpj: mapped.cnpj,
      cpf: mapped.cpf,
      status: mapped.status,
      telemetria: mapped.telemetria,
      qtdLicencas: mapped.qtdLicencas,
      acessosFranqueado: mapped.acessosFranqueado,
      acessosBackoffice: mapped.acessosBackoffice,
      observacao: rawRow["Observação"] ? String(rawRow["Observação"]).trim() : null,
    };

    const existing = await prisma.alterdataCliente.findUnique({
      where: { codPessoa: mapped.codPessoa },
    });

    if (existing) {
      await prisma.alterdataCliente.update({ where: { codPessoa: mapped.codPessoa }, data });
      updated++;
    } else {
      await prisma.alterdataCliente.create({
        data: { codPessoa: mapped.codPessoa, ...data },
      });
      inserted++;
    }
  }

  return NextResponse.json({ inserted, updated, errors });
}

export const dynamic = "force-dynamic";
