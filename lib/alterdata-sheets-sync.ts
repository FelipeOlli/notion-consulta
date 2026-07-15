import { prisma } from "@/lib/prisma";
import { readSheetRows } from "@/lib/google-sheets";
import type { AlterdataClienteStatus, AlterdataTelemetria } from "@prisma/client";

// ── Constantes ────────────────────────────────────────────────────────────────

const VALID_STATUS: AlterdataClienteStatus[] = [
  "ATIVO",
  "INATIVO",
  "EM_CANCELAMENTO",
  "DISTRATADO",
  "EM_ANDAMENTO",
];

// ── Helpers de parse ──────────────────────────────────────────────────────────

export function parseClienteStatus(raw: unknown): AlterdataClienteStatus {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if ((VALID_STATUS as string[]).includes(s)) return s as AlterdataClienteStatus;
  return "ATIVO";
}

function parseTelemetria(raw: unknown): AlterdataTelemetria | null {
  const s = String(raw ?? "").trim();
  const upper = s.toUpperCase();
  if (upper === "ATIVO" || s === "Encontrado") return "ATIVO";
  if (upper === "INATIVO" || s === "Não Encontrado" || s === "Nao Encontrado") return "INATIVO";
  return null;
}

// ── Mapeamento de linha → campos do modelo ────────────────────────────────────

export type ClienteRow = {
  codPessoa: string;
  nome: string;
  unidade: string | null;
  cnpj: string | null;
  cpf: string | null;
  status: AlterdataClienteStatus;
  telemetria: AlterdataTelemetria | null;
  qtdLicencas: number;
  acessosFranqueado: number;
  acessosBackoffice: number;
};

/**
 * Converte uma linha da planilha (mapa cabeçalho→valor) para os campos do
 * modelo AlterdataCliente. Aceita cabeçalhos em vários formatos (xlsx export,
 * template interno, Google Sheets com colunas em português).
 *
 * Também detecta automaticamente quando a coluna "Status" traz valores de
 * telemetria (Encontrado / Não Encontrado) em vez de status comercial.
 */
export function mapClienteRow(row: Record<string, string>): ClienteRow {
  const codPessoa = (
    row["Cód. Pessoa"] ??
    row["Cód. pessoa"] ??
    row["cod_pessoa"] ??
    row["CRM"] ??
    ""
  ).trim();

  const nome = (row["Nome"] ?? row["Pessoa"] ?? "").trim();

  const rawUnidade = row["Unidade"] ?? row["Unidades"] ?? row["unidade"];
  const rawCnpj = row["CNPJ"] ?? row["Cnpj"] ?? row["cnpj"];
  const rawCpf = row["CPF"] ?? row["Cpf"] ?? row["cpf"];
  const rawStatus = row["Status"] ?? row["STATUS"] ?? row["status"] ?? "";
  const rawTelemetria = row["Telemetria"] ?? row["telemetria"];

  // Detecta se a coluna Status traz valores de telemetria
  const isTelemetriaStatus =
    rawStatus === "Encontrado" ||
    rawStatus === "Não Encontrado" ||
    rawStatus === "Nao Encontrado";

  const status: AlterdataClienteStatus = isTelemetriaStatus
    ? "ATIVO"
    : parseClienteStatus(rawStatus);

  let telemetria: AlterdataTelemetria | null = null;
  if (rawTelemetria !== undefined) {
    telemetria = parseTelemetria(rawTelemetria);
  } else if (isTelemetriaStatus) {
    telemetria = parseTelemetria(rawStatus);
  }

  return {
    codPessoa,
    nome,
    unidade: rawUnidade ? rawUnidade.trim() : null,
    cnpj: rawCnpj ? rawCnpj.replace(/\D/g, "") || null : null,
    cpf: rawCpf ? rawCpf.replace(/\D/g, "") || null : null,
    status,
    telemetria,
    qtdLicencas: Number(row["Qtd. Licenças"] ?? row["Quantidade de Licenças"] ?? 1) || 1,
    acessosFranqueado:
      Number(row["Acessos Franqueado"] ?? row["Acessos_Franqueado"] ?? 0) || 0,
    acessosBackoffice:
      Number(row["Acessos Backoffice"] ?? row["Acessos_Backoffice"] ?? 0) || 0,
  };
}

// ── Diff ──────────────────────────────────────────────────────────────────────

type ExistingCliente = {
  nome: string;
  unidade: string | null;
  cnpj: string | null;
  cpf: string | null;
  status: AlterdataClienteStatus;
  telemetria: AlterdataTelemetria | null;
  qtdLicencas: number;
  acessosFranqueado: number;
  acessosBackoffice: number;
};

function buildDiff(existing: ExistingCliente, next: ClienteRow): string[] {
  const diffs: string[] = [];

  const label = (k: string): string =>
    ({
      nome: "Nome",
      unidade: "Unidade",
      cnpj: "CNPJ",
      cpf: "CPF",
      status: "Status",
      telemetria: "Telemetria",
      qtdLicencas: "Licenças",
      acessosFranqueado: "Ac. Franqueado",
      acessosBackoffice: "Ac. Backoffice",
    }[k] ?? k);

  const fields: (keyof ExistingCliente)[] = [
    "nome",
    "unidade",
    "cnpj",
    "cpf",
    "status",
    "telemetria",
    "qtdLicencas",
    "acessosFranqueado",
    "acessosBackoffice",
  ];

  for (const f of fields) {
    const oldVal = existing[f] ?? "—";
    const newVal = (next[f as keyof ClienteRow] as string | number | null) ?? "—";
    if (String(oldVal) !== String(newVal)) {
      diffs.push(`${label(f)}: ${oldVal} → ${newVal}`);
    }
  }

  return diffs;
}

// ── Resultado ─────────────────────────────────────────────────────────────────

export type SyncChange = {
  codPessoa: string;
  nome: string;
  diffs: string[];
};

export type SyncResult = {
  inserted: number;
  updated: number;
  unchanged: number;
  skipped: number;
  changes: SyncChange[];
  errors: string[];
};

// ── Função principal ──────────────────────────────────────────────────────────

export async function syncAlterdataFromSheet(): Promise<SyncResult> {
  const spreadsheetId = process.env.ALTERDATA_SHEET_ID;
  const gid = Number(process.env.ALTERDATA_SHEET_GID ?? "0");

  if (!spreadsheetId) {
    throw new Error("ALTERDATA_SHEET_ID não configurado.");
  }

  const rows = await readSheetRows(spreadsheetId, gid);

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const changes: SyncChange[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    const mapped = mapClienteRow(row);

    if (!mapped.codPessoa || !mapped.nome) {
      skipped++;
      errors.push(
        `Linha ignorada: codPessoa="${mapped.codPessoa}" nome="${mapped.nome}"`
      );
      continue;
    }

    const existing = await prisma.alterdataCliente.findUnique({
      where: { codPessoa: mapped.codPessoa },
    });

    if (!existing) {
      // Criar novo cliente
      await prisma.alterdataCliente.create({
        data: {
          codPessoa: mapped.codPessoa,
          nome: mapped.nome,
          unidade: mapped.unidade,
          cnpj: mapped.cnpj,
          cpf: mapped.cpf,
          status: mapped.status,
          telemetria: mapped.telemetria,
          qtdLicencas: mapped.qtdLicencas,
          acessosFranqueado: mapped.acessosFranqueado,
          acessosBackoffice: mapped.acessosBackoffice,
          observacoes: {
            create: {
              texto: "Cliente inserido via sincronização com Google Sheets.",
              authorEmail: "Sincronização Google Sheets",
            },
          },
        },
      });
      inserted++;
      changes.push({ codPessoa: mapped.codPessoa, nome: mapped.nome, diffs: ["Novo cliente"] });
      continue;
    }

    // Calcular diff
    const diffs = buildDiff(existing, mapped);

    if (diffs.length === 0) {
      unchanged++;
      continue;
    }

    // Atualizar e gravar log nas observações
    await prisma.alterdataCliente.update({
      where: { codPessoa: mapped.codPessoa },
      data: {
        nome: mapped.nome,
        unidade: mapped.unidade,
        cnpj: mapped.cnpj,
        cpf: mapped.cpf,
        status: mapped.status,
        telemetria: mapped.telemetria,
        qtdLicencas: mapped.qtdLicencas,
        acessosFranqueado: mapped.acessosFranqueado,
        acessosBackoffice: mapped.acessosBackoffice,
        observacoes: {
          create: {
            texto: `Sync Google Sheets — alterações: ${diffs.join("; ")}`,
            authorEmail: "Sincronização Google Sheets",
          },
        },
      },
    });

    updated++;
    changes.push({ codPessoa: mapped.codPessoa, nome: mapped.nome, diffs });
  }

  return { inserted, updated, unchanged, skipped, changes, errors };
}
