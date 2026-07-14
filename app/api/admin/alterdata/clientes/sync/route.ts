import { NextRequest, NextResponse } from "next/server";
import { ensureMaster } from "@/lib/admin-auth";
import { syncAlterdataFromSheet } from "@/lib/alterdata-sheets-sync";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.ALTERDATA_CRON_SECRET;
  const headerSecret = req.headers.get("x-cron-secret");

  const isCron = Boolean(cronSecret && headerSecret === cronSecret);
  const isMaster = isCron ? true : await ensureMaster();

  if (!isMaster) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  }

  try {
    const result = await syncAlterdataFromSheet();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[alterdata/sync]", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
