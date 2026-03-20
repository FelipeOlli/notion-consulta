import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieConfig } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ALL_MODULES_FOR_MASTER, fromPrismaModule } from "@/lib/modules";
import { verifyPassword } from "@/lib/password";
import { isLockedPrimaryAdminEmail } from "@/lib/locked-admin";
import {
  isTransientDbFailure,
  TRANSIENT_DB_USER_MESSAGE,
  withTransientDbRetry,
} from "@/lib/prisma-transient-retry";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "").trim();

    const masterEmail = String(process.env.MASTER_EMAIL ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const masterPassword = String(process.env.MASTER_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "").trim();
    if (process.env.DATABASE_URL) {
      let user;
      try {
        user = await withTransientDbRetry(() =>
          prisma.user.findUnique({
            where: { email },
            include: { moduleAccess: true },
          })
        );
      } catch (error) {
        if (isTransientDbFailure(error)) {
          return NextResponse.json({ message: TRANSIENT_DB_USER_MESSAGE }, { status: 503 });
        }
        throw error;
      }
      if (user?.active) {
        const valid = await verifyPassword(password, user.passwordHash);
        if (valid) {
          const isMasterFromEnv = Boolean(masterEmail && email === masterEmail);
          const isPrimaryAdminInDb = isLockedPrimaryAdminEmail(user.email);
          if (isMasterFromEnv || isPrimaryAdminInDb) {
            const modules = [...ALL_MODULES_FOR_MASTER];
            const token = createSessionToken({
              email: user.email,
              userId: user.id,
              role: "master",
              modules,
            });
            const response = NextResponse.json({ ok: true, role: "master", modules });
            response.cookies.set(sessionCookieConfig.name, token, {
              maxAge: sessionCookieConfig.maxAge,
              httpOnly: sessionCookieConfig.httpOnly,
              sameSite: sessionCookieConfig.sameSite,
              secure: sessionCookieConfig.secure,
              path: sessionCookieConfig.path,
            });
            return response;
          }

          const modules = (user.moduleAccess as Array<{ canRead: boolean; module: Parameters<typeof fromPrismaModule>[0] }>)
            .filter((m) => m.canRead)
            .map((m) => fromPrismaModule(m.module));
          const token = createSessionToken({ email: user.email, userId: user.id, modules });
          const response = NextResponse.json({ ok: true, modules });
          response.cookies.set(sessionCookieConfig.name, token, {
            maxAge: sessionCookieConfig.maxAge,
            httpOnly: sessionCookieConfig.httpOnly,
            sameSite: sessionCookieConfig.sameSite,
            secure: sessionCookieConfig.secure,
            path: sessionCookieConfig.path,
          });
          return response;
        }
      }
    }

    if (masterEmail && masterPassword && email === masterEmail && password === masterPassword) {
      const modules = [...ALL_MODULES_FOR_MASTER];
      const token = createSessionToken({
        email,
        role: "master",
        modules,
      });
      const response = NextResponse.json({
        ok: true,
        role: "master",
        modules,
      });
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
  } catch (error) {
    if (isTransientDbFailure(error)) {
      return NextResponse.json({ message: TRANSIENT_DB_USER_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ message: "Nao foi possivel autenticar." }, { status: 400 });
  }
}
