import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserManagementAccess } from "@/lib/admin-auth";
import { normalizeModule, toPrismaModule } from "@/lib/modules";
import { hashPassword } from "@/lib/password";
import { isLockedPrimaryAdminEmail } from "@/lib/locked-admin";

type CreateBody = {
  email?: string;
  password?: string;
  modules?: string[];
  active?: boolean;
};

function isModuleKey(value: ReturnType<typeof normalizeModule>): value is NonNullable<ReturnType<typeof normalizeModule>> {
  return value !== null;
}

export async function GET() {
  const ok = await ensureUserManagementAccess();
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  const users = await prisma.user.findMany({
    include: { moduleAccess: true },
    orderBy: { createdAt: "desc" },
  });

  const data = users.map((user) => ({
    id: user.id,
    email: user.email,
    active: user.active,
    modules: user.moduleAccess.filter((item) => item.canRead).map((item) => item.module.toLowerCase()),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const ok = await ensureUserManagementAccess();
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const body = (await request.json()) as CreateBody;
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "").trim();
    const active = body.active ?? true;
    const modules = Array.isArray(body.modules) ? body.modules.map((value) => normalizeModule(String(value))).filter(isModuleKey) : [];

    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: "E-mail invalido." }, { status: 400 });
    }
    if (isLockedPrimaryAdminEmail(email)) {
      return NextResponse.json(
        { message: "Este e-mail e reservado ao administrador principal e nao pode ser cadastrado por aqui." },
        { status: 403 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json({ message: "Senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        active,
        moduleAccess: {
          create: modules.map((moduleKey) => ({
            module: toPrismaModule(moduleKey),
            canRead: true,
            canWrite: true,
          })),
        },
      },
      include: { moduleAccess: true },
    });

    return NextResponse.json(
      {
        data: {
          id: created.id,
          email: created.email,
          active: created.active,
          modules: created.moduleAccess.map((item) => item.module.toLowerCase()),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel criar usuario.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
