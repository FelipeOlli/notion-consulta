import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieConfig } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    const adminEmail = String(process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const adminPassword = String(process.env.ADMIN_PASSWORD ?? "");

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: "Credenciais de admin nao configuradas no ambiente." },
        { status: 500 }
      );
    }

    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json({ message: "E-mail ou senha invalidos." }, { status: 401 });
    }

    const token = createSessionToken(email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieConfig.name, token, {
      maxAge: sessionCookieConfig.maxAge,
      httpOnly: sessionCookieConfig.httpOnly,
      sameSite: sessionCookieConfig.sameSite,
      secure: sessionCookieConfig.secure,
      path: sessionCookieConfig.path,
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Nao foi possivel autenticar." }, { status: 400 });
  }
}
