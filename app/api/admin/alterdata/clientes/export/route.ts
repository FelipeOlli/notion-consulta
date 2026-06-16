import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { FRANQUEADO_UNIT_PRICE, BACKOFFICE_UNIT_PRICE } from "@/lib/alterdata-pricing";

export async function GET() {
  const ok = await ensureModuleAccess("alterdata");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const clientes = await prisma.alterdataCliente.findMany({
    orderBy: { nome: "asc" },
  });

  const rows = clientes.map((c) => ({
    "Cód. Pessoa": c.codPessoa,
    "Nome": c.nome,
    "Unidade": c.unidade ?? "",
    "CNPJ": c.cnpj ?? "",
    "Status": c.status,
    "Qtd. Licenças": c.qtdLicencas,
    "Qtd. Usuários": c.qtdUsuarios,
    "Acessos Franqueado": c.acessosFranqueado,
    "Acessos Backoffice": c.acessosBackoffice,
    "V. Franqueado": c.acessosFranqueado * FRANQUEADO_UNIT_PRICE,
    "V. Backoffice": c.acessosBackoffice * BACKOFFICE_UNIT_PRICE,
    "Observação": c.observacao ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 14 }, { wch: 50 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Clientes");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const filename = `clientes_alterdata_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

export const dynamic = "force-dynamic";
