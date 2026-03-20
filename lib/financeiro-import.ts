/** Parse export Google Admin (JSON com array `users`). */
export function parseGoogleWorkspaceUsersJson(text: string): { totalUsers: number; activeUsers: number } {
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
  const totalUsers = users.length;
  let activeUsers = 0;
  for (const u of users) {
    if (!u || typeof u !== "object") continue;
    const status = String((u as Record<string, unknown>)["Status [READ ONLY]"] ?? "").trim().toLowerCase();
    if (status === "active") activeUsers += 1;
  }
  return { totalUsers, activeUsers };
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
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let count = 0;
  for (const line of lines) {
    const cols = parseCsvLine(line);
    const first = (cols[0] ?? "").trim();
    if (!first) continue;
    if (first.toUpperCase() === "ID") continue;
    if (!/^\d+$/.test(first)) continue;
    count += 1;
  }
  if (count === 0) {
    throw new Error("Nenhuma linha de colaborador encontrada no CSV.");
  }
  return { totalUsers: count };
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
