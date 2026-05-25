import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import net from "net";
import { exec } from "child_process";

const TIMEOUT_MS = 8000;

async function checkHttp(host: string): Promise<{ status: "UP" | "DOWN"; ping: number | null; message?: string }> {
  const url = /^https?:\/\//i.test(host) ? host : `http://${host}`;
  const start = Date.now();
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    });
    const ping = Date.now() - start;
    return { status: response.ok || response.status < 500 ? "UP" : "DOWN", ping };
  } catch (err) {
    return { status: "DOWN", ping: null, message: err instanceof Error ? err.message : "Timeout" };
  }
}

async function checkTcp(host: string, port: number): Promise<{ status: "UP" | "DOWN"; ping: number | null; message?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: { status: "UP" | "DOWN"; ping: number | null; message?: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(TIMEOUT_MS);
    socket.connect(port, host, () => finish({ status: "UP", ping: Date.now() - start }));
    socket.on("error", (err) => finish({ status: "DOWN", ping: null, message: err.message }));
    socket.on("timeout", () => finish({ status: "DOWN", ping: null, message: "Timeout" }));
  });
}

async function checkPing(host: string): Promise<{ status: "UP" | "DOWN"; ping: number | null; message?: string }> {
  return new Promise((resolve) => {
    // -c 1 = 1 packet, -W 5 = 5s timeout (Linux); -n 1 -w 5000 (Windows)
    const isWin = process.platform === "win32";
    const cmd = isWin
      ? `ping -n 1 -w 5000 ${host}`
      : `ping -c 1 -W 5 ${host}`;

    const start = Date.now();
    exec(cmd, { timeout: 8000 }, (error, stdout) => {
      const elapsed = Date.now() - start;
      if (error) {
        resolve({ status: "DOWN", ping: null, message: "Host unreachable" });
        return;
      }
      // Parse ping time from output (e.g. "time=12.3 ms" or "time<1ms")
      const match = stdout.match(/time[=<]([\d.]+)\s*ms/i);
      const ping = match ? Math.round(parseFloat(match[1])) : elapsed;
      resolve({ status: "UP", ping });
    });
  });
}

async function runCheck(monitorId: string): Promise<{
  id: string;
  lastStatus: "UP" | "DOWN" | "PENDING";
  lastPing: number | null;
  lastChecked: string;
  changed: boolean;
}> {
  const monitor = await prisma.ipMonitor.findUnique({ where: { id: monitorId } });
  if (!monitor) throw new Error("Monitor nao encontrado.");

  const result =
    monitor.type === "PING"
      ? await checkPing(monitor.host)
      : monitor.type === "TCP" && monitor.port
        ? await checkTcp(monitor.host, monitor.port)
        : await checkHttp(monitor.host);

  const newStatus = result.status;
  const changed = monitor.lastStatus !== newStatus && monitor.lastStatus !== "PENDING";
  const isTransition = monitor.lastStatus !== newStatus;

  const updated = await prisma.ipMonitor.update({
    where: { id: monitorId },
    data: {
      lastStatus: newStatus,
      lastChecked: new Date(),
      lastPing: result.ping,
    },
  });

  if (isTransition) {
    const recentEvents = await prisma.ipMonitorEvent.findMany({
      where: { monitorId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { status: true },
    });
    const recentDowns = recentEvents.filter((e) => e.status === "DOWN").length;
    const flapping = recentDowns >= 3;

    if (newStatus === "DOWN" && flapping) {
      // pausa: 3+ quedas recentes, não registra para não encher o banco
    } else {
      await prisma.ipMonitorEvent.create({
        data: {
          monitorId,
          status: newStatus,
          ping: result.ping,
          message:
            newStatus === "UP" && flapping
              ? "Conexão restaurada após múltiplas quedas"
              : result.message,
        },
      });
    }
  }

  return {
    id: monitorId,
    lastStatus: updated.lastStatus,
    lastPing: updated.lastPing,
    lastChecked: updated.lastChecked!.toISOString(),
    changed,
  };
}

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("senha");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({})) as { id?: string };

    if (body.id) {
      const result = await runCheck(body.id);
      return NextResponse.json({ data: [result] });
    }

    // Check all active monitors due for a check
    const now = new Date();
    const monitors = await prisma.ipMonitor.findMany({ where: { active: true } });
    const due = monitors.filter((m) => {
      if (!m.lastChecked) return true;
      return (now.getTime() - m.lastChecked.getTime()) / 1000 >= m.interval;
    });

    const results = await Promise.allSettled(due.map((m) => runCheck(m.id)));
    const data = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof runCheck>>> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao verificar monitors.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
