import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieConfig } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    const masterEmail = String(process.env.MASTER_EMAIL ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const masterPassword = String(process.env.MASTER_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "").trim();
    const viewerEmail = String(process.env.VIEWER_EMAIL ?? "").trim().toLowerCase();
    const viewerPassword = String(process.env.VIEWER_PASSWORD ?? "").trim();

    if (masterEmail && masterPassword && email === masterEmail && password === masterPassword) {
      const token = createSessionToken(email, "master");
      const response = NextResponse.json({ ok: true, role: "master" });
      response.cookies.set(sessionCookieConfig.name, token, {
        maxAge: sessionCookieConfig.maxAge,
        httpOnly: sessionCookieConfig.httpOnly,
        sameSite: sessionCookieConfig.sameSite,
        secure: sessionCookieConfig.secure,
        path: sessionCookieConfig.path,
      });
      return response;
    }

    if (viewerEmail && viewerPassword && email === viewerEmail && password === viewerPassword) {
      const token = createSessionToken(email, "viewer");
      const response = NextResponse.json({ ok: true, role: "viewer" });
      response.cookies.set(sessionCookieConfig.name, token, {
        maxAge: sessionCookieConfig.maxAge,
        httpOnly: sessionCookieConfig.httpOnly,
        sameSite: sessionCookieConfig.sameSite,
        secure: sessionCookieConfig.secure,
        path: sessionCookieConfig.path,
      });
      return response;
    }

    return NextResponse.json({ message: "E-mail ou senha invalidos." }, { status: 401 });
  } catch {
    return NextResponse.json({ message: "Nao foi possivel autenticar." }, { status: 400 });
  }
}
