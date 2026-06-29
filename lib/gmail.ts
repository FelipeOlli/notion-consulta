import { google } from "googleapis";

const MAILBOX = process.env.DOMINIO_MAILBOX ?? "ti@cfcontabilidade.com";
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getAuth() {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("GOOGLE_SA_CLIENT_EMAIL e GOOGLE_SA_PRIVATE_KEY são obrigatórias.");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
    subject: MAILBOX,
  });
}

export async function searchMessages(query: string): Promise<string[]> {
  const auth = getAuth();
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.list({
    userId: MAILBOX,
    q: query,
    maxResults: 50,
  });
  return (res.data.messages ?? []).map((m) => m.id!).filter(Boolean);
}

export type MessageMeta = {
  id: string;
  remetente: string | null;
  assunto: string | null;
  snippet: string | null;
  receivedAt: Date | null;
};

export async function getMessageMeta(messageId: string): Promise<MessageMeta> {
  const auth = getAuth();
  const gmail = google.gmail({ version: "v1", auth });
  const res = await gmail.users.messages.get({
    userId: MAILBOX,
    id: messageId,
    format: "metadata",
    metadataHeaders: ["From", "Subject", "Date"],
  });

  const headers = res.data.payload?.headers ?? [];
  const get = (name: string) => headers.find((h) => h.name === name)?.value ?? null;

  const dateStr = get("Date");
  let receivedAt: Date | null = null;
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) receivedAt = parsed;
  }

  return {
    id: messageId,
    remetente: get("From"),
    assunto: get("Subject"),
    snippet: res.data.snippet ?? null,
    receivedAt,
  };
}
