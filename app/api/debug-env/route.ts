import { NextResponse } from "next/server";

export async function GET() {
  const masterEmail = String(process.env.MASTER_EMAIL ?? process.env.ADMIN_EMAIL ?? "").trim();
  const masterPassword = String(process.env.MASTER_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "").trim();
  const authSecretSet = Boolean(
    process.env.AUTH_SECRET && String(process.env.AUTH_SECRET).length >= 24
  );

  return NextResponse.json({
    ok: masterEmail.length > 0 && masterPassword.length > 0 && authSecretSet,
    MASTER_EMAIL: masterEmail.length > 0 ? "definido" : "ausente",
    MASTER_PASSWORD: masterPassword.length > 0 ? "definido" : "ausente",
    AUTH_SECRET: authSecretSet ? "definido" : "ausente",
    NODE_ENV: process.env.NODE_ENV ?? "não definido",
  });
}
