import { NextResponse } from "next/server";
import { sessionCookieConfig } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieConfig.name, "", {
    maxAge: 0,
    httpOnly: sessionCookieConfig.httpOnly,
    sameSite: sessionCookieConfig.sameSite,
    secure: sessionCookieConfig.secure,
    path: sessionCookieConfig.path,
  });
  return response;
}
