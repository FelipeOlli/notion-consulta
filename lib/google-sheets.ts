import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

function getAuth() {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_SA_CLIENT_EMAIL e GOOGLE_SA_PRIVATE_KEY são obrigatórias.");
  }

  // JWT sem impersonação — acesso direto pelo service account ou via compartilhamento com o SA
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
}

/**
 * Lê todas as linhas de uma aba do Google Sheets, retornando array de objetos
 * com chaves = cabeçalhos da 1ª linha e valores = strings.
 *
 * @param spreadsheetId  — ID da planilha (parte após /d/ na URL)
 * @param gid            — sheetId numérico (parâmetro #gid= na URL)
 */
export async function readSheetRows(
  spreadsheetId: string,
  gid: number
): Promise<Record<string, string>[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Descobrir o título da aba pelo sheetId numérico
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties",
  });

  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.sheetId === gid
  );

  if (!sheet?.properties?.title) {
    throw new Error(`Aba com gid=${gid} não encontrada na planilha ${spreadsheetId}.`);
  }

  const title = sheet.properties.title;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: title,
  });

  const rows = res.data.values ?? [];
  if (rows.length === 0) return [];

  const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());

  return (rows.slice(1) as unknown[][]).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = String(row[i] ?? "").trim();
    });
    return obj;
  });
}
