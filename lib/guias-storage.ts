import path from "path";
import { promises as fs } from "fs";

/**
 * Diretório persistente dos uploads de Guias TI.
 * Fica fora de /public para sobreviver a rebuilds do container
 * (montar volume do EasyPanel em /app/data). Sobrescrevível via GUIAS_UPLOADS_DIR.
 */
export const GUIAS_UPLOADS_DIR =
  process.env.GUIAS_UPLOADS_DIR || path.join(process.cwd(), "data", "uploads", "guias");

/** Diretório legado (dentro de public), apagado a cada deploy. */
const LEGACY_DIR = path.join(process.cwd(), "public", "uploads", "guias");

/** Resolve o caminho físico de um arquivo, procurando no diretório novo e no legado. */
export async function resolveGuiaFile(filename: string): Promise<string | null> {
  const safe = path.basename(filename);
  for (const dir of [GUIAS_UPLOADS_DIR, LEGACY_DIR]) {
    const p = path.join(dir, safe);
    try {
      await fs.access(p);
      return p;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

/** Extrai o nome do arquivo de uma URL salva (/api/admin/guias-ti/files/x ou /uploads/guias/x). */
export function guiaFilenameFromUrl(url: string): string | null {
  if (url.startsWith("/api/admin/guias-ti/files/") || url.startsWith("/uploads/guias/")) {
    return path.basename(url);
  }
  return null;
}
