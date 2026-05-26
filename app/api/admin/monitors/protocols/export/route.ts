import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const monitorId = searchParams.get("monitorId");

    const where: { monitorId?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
    if (monitorId) where.monitorId = monitorId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const records = await prisma.ipMonitorProtocol.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { monitor: { select: { name: true, host: true } } },
    });

    const rows = records.map((r) => ({
      Monitor: r.monitor.name,
      Host: r.monitor.host,
      Protocolo: r.protocol,
      "Ordem de Serviço": r.serviceOrder,
      "Data/Hora": new Date(r.createdAt).toLocaleString("pt-BR"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Protocolos");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const monitorName = monitorId && records[0]
      ? records[0].monitor.name.replace(/[^\p{L}\p{N}\-_]+/gu, "_").slice(0, 40)
      : null;
    const filename = `protocolos${monitorName ? `_${monitorName}` : ""}${from || to ? `_${from ?? ""}${to ? `_ate_${to}` : ""}` : ""}.xlsx`;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ message: raw || "Erro ao gerar Excel." }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
