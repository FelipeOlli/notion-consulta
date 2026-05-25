export type GoogleImportRow = {
  email: string;
  displayName: string;
  status: string;
  companyLabel: string;
  detail: string;
};

export type TimImportRow = {
  displayName: string;
  companyLabel: string;
  detail: string;
  meta: Record<string, string>;
};

/** Mapeia dominio do e-mail para nome amigavel da "empresa" (categorizacao). */
export function companyLabelFromEmailDomain(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  const domain = at === -1 ? "" : e.slice(at + 1).trim();
  if (!domain) return "Sem dominio";

  const map: Record<string, string> = {
    "cfcontabilidade.com": "CFCONTABILIDADE.COM",
    "cfcontabilidade.com.br": "CFCONTABILIDADE.COM.BR",
    "empresainquebravel.com.br": "Empresa Inquebravel",
    "cfaltamira.com.br": "CF Altamira",
  };
  return map[domain] ?? domain;
}

/** Parse export Google Admin (JSON com array `users`). */
export function parseGoogleWorkspaceUsersJson(text: string): { totalUsers: number; activeUsers: number } {
  const { totalUsers, activeUsers } = parseGoogleWorkspaceUsersJsonRows(text);
  return { totalUsers, activeUsers };
}

export function parseGoogleWorkspaceUsersJsonRows(text: string): {
  rows: GoogleImportRow[];
  totalUsers: number;
  activeUsers: number;
} {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Arquivo JSON invalido.");
  }
  if (!data || typeof data !== "object" || !Array.isArray((data as { users?: unknown }).users)) {
    throw new Error('JSON deve conter a propriedade "users" (array).');
  }
  const users = (data as { users: unknown[] }).users;
  const rows: GoogleImportRow[] = [];
  let activeUsers = 0;
  for (const u of users) {
    if (!u || typeof u !== "object") continue;
    const rec = u as Record<string, unknown>;
    const email = String(rec["Email Address [Required]"] ?? "").trim().toLowerCase();
    const first = String(rec["First Name [Required]"] ?? "").trim();
    const last = String(rec["Last Name [Required]"] ?? "").trim();
    const displayName = `${first} ${last}`.trim() || email || "(sem nome)";
    const status = String(rec["Status [READ ONLY]"] ?? "").trim();
    if (status.toLowerCase() === "active") activeUsers += 1;
    const companyLabel = email ? companyLabelFromEmailDomain(email) : "Sem e-mail";
    const usage = String(rec["Email Usage [READ ONLY]"] ?? "").trim();
    rows.push({
      email,
      displayName,
      status,
      companyLabel,
      detail: usage ? `E-mail: ${usage}` : "",
    });
  }
  return { rows, totalUsers: rows.length, activeUsers };
}

/** Linha CSV com vírgulas e aspas (estilo export Excel). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

/** Conta colaboradores no CSV Time is Money (uma linha = um usuário; ignora cabeçalho). */
export function parseTimeIsMoneyCollaboratorsCsv(text: string): { totalUsers: number } {
  const { totalUsers } = parseTimeIsMoneyCollaboratorsCsvRows(text);
  return { totalUsers };
}

function normalizeHeaderCell(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Se a primeira linha for cabeçalho, mapeia nomes -> indice. ID é opcional. */
function timHeaderIndices(headerCols: string[]): Record<string, number> | null {
  const joined = headerCols.map(normalizeHeaderCell).join("|");
  if (!joined.includes("nome")) return null;
  const map: Record<string, number> = {};
  headerCols.forEach((raw, i) => {
    const h = normalizeHeaderCell(raw);
    if (h === "id") map.id = i;
    else if (h === "nome") map.nome = i;
    else if (h.includes("versao") && h.includes("app")) map.versaoApp = i;
    else if (h.includes("dispositivo")) map.dispositivo = i;
    else if (h.includes("telefone")) map.telefone = i;
    else if (h.includes("ultima") && h.includes("atividade")) map.ultimaAtividade = i;
    else if (h.includes("departamento")) map.departamento = i;
    else if (h.includes("criado")) map.criadoEm = i;
  });
  return map.nome !== undefined ? map : null;
}

function pick(cols: string[], idx: number | undefined): string {
  if (idx === undefined || idx < 0) return "";
  return (cols[idx] ?? "").trim();
}

/**
 * CSV Time Is Money: usa linha de cabeçalho quando existir; senao indices fixos.
 * "Empresa" = Departamento (area/franquia).
 */
export function parseTimeIsMoneyCollaboratorsCsvRows(text: string): { rows: TimImportRow[]; totalUsers: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("Nenhuma linha de colaborador encontrada no CSV.");
  }

  let headerMap: Record<string, number> | null = null;
  let dataLines = lines;
  for (let hi = 0; hi < lines.length; hi++) {
    const cols = parseCsvLine(lines[hi] ?? "");
    const m = timHeaderIndices(cols);
    if (m) {
      headerMap = m;
      dataLines = lines.filter((_, i) => i !== hi);
      break;
    }
  }

  const rows: TimImportRow[] = [];
  let autoId = 1;
  for (const line of dataLines) {
    const cols = parseCsvLine(line);
    const first = (cols[0] ?? "").trim();
    if (!first) continue;

    let id: string;
    let displayName: string;
    let version: string;
    let device: string;
    let phone: string;
    let lastAct: string;
    let department: string;
    let created: string;

    if (headerMap) {
      // com cabeçalho: ID é opcional — usa o da coluna ou gera sequencial
      displayName = pick(cols, headerMap.nome) || "(sem nome)";
      if (!displayName || displayName === "(sem nome)") continue;
      id = headerMap.id !== undefined ? pick(cols, headerMap.id) || String(autoId++) : String(autoId++);
      version = pick(cols, headerMap.versaoApp);
      device = pick(cols, headerMap.dispositivo);
      phone = pick(cols, headerMap.telefone);
      lastAct = pick(cols, headerMap.ultimaAtividade);
      department = pick(cols, headerMap.departamento);
      created = pick(cols, headerMap.criadoEm);
    } else {
      // sem cabeçalho: mantém comportamento original (primeira coluna = ID numérico)
      if (first.toUpperCase() === "ID") continue;
      if (!/^\d+$/.test(first)) continue;
      id = first;
      displayName = (cols[1] ?? "").trim() || "(sem nome)";
      version = (cols[2] ?? "").trim();
      device = (cols[3] ?? "").trim();
      phone = (cols[4] ?? "").trim();
      lastAct = (cols[5] ?? "").trim();
      department = (cols[6] ?? "").trim();
      created = (cols[7] ?? "").trim();
    }

    const companyLabel = department || "Sem departamento";
    const detail = [phone && `Tel: ${phone}`, device && `PC: ${device}`].filter(Boolean).join(" · ");

    rows.push({
      displayName,
      companyLabel,
      detail,
      meta: {
        id,
        versaoApp: version,
        dispositivo: device,
        telefone: phone,
        ultimaAtividade: lastAct,
        departamento: department,
        criadoEm: created,
      },
    });
  }
  if (rows.length === 0) {
    throw new Error("Nenhuma linha de colaborador encontrada no CSV.");
  }
  return { rows, totalUsers: rows.length };
}

export type GoogleCsvImportRow = {
  email: string;
  displayName: string;
  status: string;
  companyLabel: string;
  detail: string;
};

/**
 * Parse do CSV export do Google Admin Console.
 * Usa "Org Unit Path [Required]" (sem a "/" inicial) como categoria da linha.
 */
export function parseGoogleWorkspaceCsvRows(text: string): {
  rows: GoogleCsvImportRow[];
  totalUsers: number;
  activeUsers: number;
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV vazio ou sem dados.");

  const header = parseCsvLine(lines[0] ?? "");
  const col = {
    firstName: header.findIndex((h) => h.trim() === "First Name [Required]"),
    lastName: header.findIndex((h) => h.trim() === "Last Name [Required]"),
    email: header.findIndex((h) => h.trim() === "Email Address [Required]"),
    orgUnit: header.findIndex((h) => h.trim() === "Org Unit Path [Required]"),
    status: header.findIndex((h) => h.trim() === "Status [READ ONLY]"),
    emailUsage: header.findIndex((h) => h.trim() === "Email Usage [READ ONLY]"),
  };

  if (col.email === -1 || col.orgUnit === -1) {
    throw new Error(
      'CSV invalido: colunas "Email Address [Required]" e "Org Unit Path [Required]" sao obrigatorias.'
    );
  }

  const rows: GoogleCsvImportRow[] = [];
  let activeUsers = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i] ?? "");
    const email = (cols[col.email] ?? "").trim().toLowerCase();
    if (!email) continue;

    const first = col.firstName >= 0 ? (cols[col.firstName] ?? "").trim() : "";
    const last = col.lastName >= 0 ? (cols[col.lastName] ?? "").trim() : "";
    const displayName = `${first} ${last}`.trim() || email;

    const status = col.status >= 0 ? (cols[col.status] ?? "").trim() : "";
    if (status.toLowerCase() === "active") activeUsers += 1;

    const orgUnit = col.orgUnit >= 0 ? (cols[col.orgUnit] ?? "").trim() : "";
    const companyLabel = orgUnit.replace(/^\//, "").trim() || "Sem unidade";

    const usage = col.emailUsage >= 0 ? (cols[col.emailUsage] ?? "").trim() : "";

    rows.push({ email, displayName, status, companyLabel, detail: usage ? `E-mail: ${usage}` : "" });
  }

  if (rows.length === 0) throw new Error("Nenhum usuario encontrado no CSV.");
  return { rows, totalUsers: rows.length, activeUsers };
}

/** Competência: primeiro dia do mês em UTC (YYYY-MM). */
export function competenceFromYearMonth(yearMonth: string): Date {
  const m = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim());
  if (!m) throw new Error("Competencia invalida. Use AAAA-MM.");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) throw new Error("Mes invalido.");
  return new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
}
