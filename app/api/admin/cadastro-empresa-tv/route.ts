import { NextResponse } from "next/server";
import { ensureMaster } from "@/lib/admin-auth";
import { fetchTarefas, isOnetyConfigured } from "@/lib/onety-api";

export const dynamic = "force-dynamic";

// Fallback: dashboard_ti no Vercel (usado quando Onety nao responder)
const FALLBACK_URL =
  process.env.CADASTRO_TV_API_URL ??
  "https://dashboard-tarefa-six.vercel.app/api/cadastro-empresa-tv";

// ---------------------------------------------------------------------------
// Tipos locais
// ---------------------------------------------------------------------------

type CadastroAtrasada = {
  id: number | string;
  empresaNome: string;
  dataAbertura: string;
  responsavel: string;
  diasAtraso: number;
};

type CadastroTvResult = {
  mesNome: string;
  totalMes: number;
  pendentes: number;
  atrasadas: number;
  concluidas: number;
  listaAtrasadas: CadastroAtrasada[];
};

// ---------------------------------------------------------------------------
// Logica de classificacao (espelha dashboard_ti/api/cadastro-empresa-tv.js)
// ---------------------------------------------------------------------------

function calcularMetricas(tarefas: Record<string, unknown>[]): CadastroTvResult {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const tasksThisMonth = tarefas.filter((t) => {
    const dc = t["data_criacao"] as string | undefined;
    if (!dc) return false;
    const d = new Date(dc);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  let pendentes = 0;
  let atrasadas = 0;
  let concluidas = 0;
  const listaAtrasadas: CadastroAtrasada[] = [];

  for (const t of tarefas) {
    const situacao = ((t["situacao"] as string) ?? "").toLowerCase();
    const isCancelada = ["cancelado", "distrato", "reprovado"].some((s) => situacao.includes(s));
    if (isCancelada) continue;

    const isConcluida =
      Boolean(t["data_conclusao"]) ||
      ["concluido", "concluida", "encerrado"].some((s) => situacao.includes(s));

    const createdDate = t["data_criacao"] ? new Date(t["data_criacao"] as string) : null;
    const conclusaoDate = t["data_conclusao"] ? new Date(t["data_conclusao"] as string) : null;
    const isConcluidaThisMonth =
      conclusaoDate &&
      conclusaoDate.getMonth() === currentMonth &&
      conclusaoDate.getFullYear() === currentYear;

    if (!isConcluida) {
      let isAtrasada = false;
      let diffDays = 0;

      if (createdDate) {
        const timeDiff = now.getTime() - createdDate.getTime();
        if (timeDiff > oneDayMs) {
          isAtrasada = true;
          diffDays = Math.ceil(timeDiff / oneDayMs);
        }
      } else {
        const prazo = t["data_prazo"] ? new Date(t["data_prazo"] as string) : null;
        if (prazo && now > prazo) {
          isAtrasada = true;
          diffDays = Math.ceil((now.getTime() - prazo.getTime()) / oneDayMs);
        }
      }

      if (isAtrasada) {
        atrasadas++;
        const respRaw = t["responsavel"];
        const resp =
          typeof respRaw === "object" && respRaw !== null
            ? ((respRaw as Record<string, unknown>)["nome"] as string) ??
              ((respRaw as Record<string, unknown>)["login"] as string) ??
              "Nao atribuido"
            : (respRaw as string) ?? "Nao atribuido";

        const empresa = t["empresa"] as Record<string, unknown> | undefined;

        listaAtrasadas.push({
          id: t["id"] as number | string,
          empresaNome: (empresa?.["nome"] as string) ?? "Cliente Sem Nome",
          dataAbertura: createdDate
            ? createdDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
            : "N/A",
          responsavel: resp,
          diasAtraso: diffDays,
        });
      } else {
        pendentes++;
      }
    } else if (isConcluidaThisMonth) {
      concluidas++;
    }
  }

  listaAtrasadas.sort((a, b) => b.diasAtraso - a.diasAtraso);

  const mesRaw = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mesNome = mesRaw.charAt(0).toUpperCase() + mesRaw.slice(1);

  return {
    mesNome,
    totalMes: tasksThisMonth.length,
    pendentes,
    atrasadas,
    concluidas,
    listaAtrasadas,
  };
}

// ---------------------------------------------------------------------------
// Fonte primaria: Onety diretamente
// ---------------------------------------------------------------------------

async function fromOnety(): Promise<CadastroTvResult> {
  const tarefas = await fetchTarefas();
  return calcularMetricas(tarefas as Record<string, unknown>[]);
}

// ---------------------------------------------------------------------------
// Fonte secundaria: Vercel (dashboard_ti)
// ---------------------------------------------------------------------------

type VercelResponse = {
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

async function fromVercel(): Promise<CadastroTvResult> {
  const res = await fetch(FALLBACK_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Vercel fallback respondeu " + res.status);
  const json: VercelResponse = await res.json();
  return {
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
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET() {
  const ok = await ensureMaster();
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 403 });

  // 1. Primario: Onety direto (so tenta se a key estiver configurada)
  if (isOnetyConfigured()) {
    try {
      const data = await fromOnety();
      return NextResponse.json(data);
    } catch (err) {
      console.warn("[cadastro-empresa-tv] Onety falhou, usando fallback Vercel:", err);
    }
  }

  // 2. Secundario: Vercel (dashboard_ti)
  try {
    const data = await fromVercel();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[cadastro-empresa-tv] Fallback Vercel tambem falhou:", err);
    return NextResponse.json(
      { message: "Falha ao consultar metricas de cadastro de empresa.", detail: String(err) },
      { status: 502 }
    );
  }
}