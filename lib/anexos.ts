import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const ANEXOS_DIR = path.join(process.cwd(), "data", "anexos");
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_MIME_EXACT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function isMimeAllowed(mime: string): boolean {
  if (ALLOWED_MIME_EXACT.includes(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

export async function saveFile(
  file: File
): Promise<{ filePath: string; fileName: string; fileSize: number; mimeType: string }> {
  await fs.mkdir(ANEXOS_DIR, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const name = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const absolutePath = path.join(ANEXOS_DIR, name);
  const content = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absolutePath, content);
  return {
    filePath: path.join("data", "anexos", name),
    fileName: file.name,
    fileSize: content.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}
