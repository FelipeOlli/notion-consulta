import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";

const SUPABASE_URL = "https://bavkzxkcchxtvurbabzi.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdmt6eGtjY2h4dHZ1cmJhYnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODE1NjksImV4cCI6MjA5MDU1NzU2OX0.YrycwqyzLZPzqPChMHzge8Q-hx8AonQNkfsRlFn67iY";
const EMAIL = "ti@cfcontabilidade.com";
const PASSWORD = "Sup0rt3.@r00t";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  if (session.role !== "master" && !session.modules?.includes("cadastro_empresa")) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 403 });
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    cache: "no-store",
  });

  if (!res.ok) return NextResponse.json({ message: "Falha ao autenticar no sistema externo." }, { status: 502 });

  const { access_token, refresh_token, expires_in } = await res.json();
  return NextResponse.json({ access_token, refresh_token, expires_in });
}

export const dynamic = "force-dynamic";
