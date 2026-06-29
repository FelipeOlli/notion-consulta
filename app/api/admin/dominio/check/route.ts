import { NextRequest, NextResponse } from "next/server";
import { checkSscs } from "@/lib/dominio-check";
import { ensureModuleAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.DOMINIO_CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");

  const isCron = cronSecret && headerSecret === cronSecret;
  const isUser = await ensureModuleAccess("dominio");

  if (!isCron && !isUser) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  }

  let sscId: string | undefined;
  try {
    const body = await req.json();
    sscId = body.sscId;
  } catch {
    // body opcional
  }

  const results = await checkSscs(sscId);
  const totalNovas = results.reduce((acc, r) => acc + r.novasUpdates, 0);

  return NextResponse.json({ ok: true, totalNovas, results });
}
