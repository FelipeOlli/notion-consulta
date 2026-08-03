import { NextResponse } from "next/server";
import { ensureMaster } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// URL pública (sem auth) da API de métricas de cadastro de empresa. Não é segredo — só
// vira env se algum dia precisar apontar para outro ambiente.
const DEFAULT_API_URL = "https://dashboard-tarefa-six.vercel.app/api/cadastro-empresa-tv";

type CadastroTvApiResponse = {
  mes_nome: string;
  total_mes: number;
  pendentes: number;
  atrasadas: number;
  concluidas: number;
  lista_atrasadas: {
    id: number;
    empresa_nome: string;
    data_abertura: string;
    responsavel: string;
    dias_atraso: number;
  }[];
};

export async function GET() {
  const ok = await ensureMaster();
  if (!ok) return NextResponse.json({ message: "Não autorizado." }, { status: 403 });

  const apiUrl = process.env.CADASTRO_TV_API_URL || DEFAULT_API_URL;

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) {
      console.error("[cadastro-empresa-tv] resposta não-ok", res.status);
      return NextResponse.json(
        { message: "Falha ao consultar métricas de cadastro de empresa.", detail: `status ${res.status}` },
        { status: 502 }
      );
    }

    const json: CadastroTvApiResponse = await res.json();

    return NextResponse.json({
      mesNome: json.mes_nome,
      totalMes: Number(json.total_mes ?? 0),
      pendentes: Number(json.pendentes ?? 0),
      atrasadas: Number(json.atrasadas ?? 0),
      concluidas: Number(json.concluidas ?? 0),
      listaAtrasadas: (json.lista_atrasadas ?? []).map((t) => ({
        id: t.id,
        empresaNome: t.empresa_nome,
        dataAbertura: t.data_abertura,
        responsavel: t.responsavel,
        diasAtraso: Number(t.dias_atraso ?? 0),
      })),
    });
  } catch (err) {
    console.error("[cadastro-empresa-tv] erro ao conectar", err);
    return NextResponse.json(
      { message: "Erro ao conectar à API de cadastro de empresa.", detail: String(err) },
      { status: 502 }
    );
  }
}
