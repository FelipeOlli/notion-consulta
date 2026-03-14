import { NextResponse } from "next/server";

/**
 * Diagnóstico: verifica se as variáveis de ambiente chegam no app.
 * Acesse: GET /api/debug-env
 * Remova ou proteja esta rota em produção se não quiser expor.
 */
export async function GET() {
  const masterEmail = String(process.env.MASTER_EMAIL ?? process.env.ADMIN_EMAIL ?? "").trim();
  const masterPassword = String(process.env.MASTER_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "").trim();
  const viewerEmail = String(process.env.VIEWER_EMAIL ?? "").trim();
  const viewerPassword = String(process.env.VIEWER_PASSWORD ?? "").trim();
  const authSecretSet = Boolean(
    process.env.AUTH_SECRET && String(process.env.AUTH_SECRET).length >= 24
  );

  return NextResponse.json({
    ok: (masterEmail.length > 0 && masterPassword.length > 0) && authSecretSet,
    MASTER_EMAIL: masterEmail.length > 0 ? "definido" : "ausente",
    MASTER_PASSWORD: masterPassword.length > 0 ? "definido" : "ausente",
    VIEWER_EMAIL: viewerEmail.length > 0 ? "definido" : "ausente",
    VIEWER_PASSWORD: viewerPassword.length > 0 ? "definido" : "ausente",
    AUTH_SECRET: authSecretSet ? "definido" : "ausente",
    NODE_ENV: process.env.NODE_ENV ?? "não definido",
  });
}
