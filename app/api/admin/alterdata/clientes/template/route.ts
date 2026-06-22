import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET() {
  const ok = await ensureModuleAccess("alterdata");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const rows = [
    {
      "Cód. Pessoa": "874796",
      "Nome": "EXEMPLO CONTABILIDADE LTDA",
      "Unidade": "CF EXEMPLO",
      "CNPJ": "00.000.000/0000-00",
      "Status": "ATIVO",
      "Qtd. Licenças": 1,
      "Acessos Franqueado": 0,
      "Acessos Backoffice": 1,
      "Observação": "",
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 14 }, { wch: 50 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    { wch: 20 }, { wch: 20 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Clientes");

  // Aba de referência de status
  const wsStatus = XLSX.utils.aoa_to_sheet([
    ["Status válidos para a coluna Status:"],
    ["ATIVO"],
    ["INATIVO"],
    ["INADIMPLENTE"],
    ["CONGELADO"],
    ["DISTRATADO"],
  ]);
  XLSX.utils.book_append_sheet(wb, wsStatus, "Status Válidos");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template_alterdata_clientes.xlsx"`,
    },
  });
}

export const dynamic = "force-dynamic";
