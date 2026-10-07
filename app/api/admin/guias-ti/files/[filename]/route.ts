import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ensureModuleAccess } from "@/lib/admin-auth";
import { resolveGuiaFile } from "@/lib/guias-storage";

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".txt": "text/plain",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const ok = await ensureModuleAccess("guias_ti");
  if (!ok) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const { filename } = await params;
  // Prevenção básica de path traversal
  const safeBase = path.basename(filename);
  const filePath = await resolveGuiaFile(safeBase);
  if (!filePath) {
    return NextResponse.json({ message: "Arquivo não encontrado." }, { status: 404 });
  }
  const stat = await fs.stat(filePath);

  const ext = path.extname(safeBase).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";
  const fileSize = stat.size;
  const range = request.headers.get("range");

  // Suporte crucial a HTTP Range 206 para vídeo e áudio HTML5 scrubbing/streaming
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const chunksize = end - start + 1;
    const fileHandle = await fs.open(filePath, "r");
    const buffer = Buffer.alloc(chunksize);
    await fileHandle.read(buffer, 0, chunksize, start);
    await fileHandle.close();

    return new NextResponse(new Uint8Array(buffer), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunksize),
        "Content-Type": contentType,
      },
    });
  }

  const data = await fs.readFile(filePath);
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileSize),
      "Accept-Ranges": "bytes",
    },
  });
}

export const dynamic = "force-dynamic";
