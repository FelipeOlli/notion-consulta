import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureUserManagementAccess } from "@/lib/admin-auth";
import { normalizeModule, toPrismaModule } from "@/lib/modules";
import { hashPassword } from "@/lib/password";
import { isLockedPrimaryAdminEmail, LOCKED_PRIMARY_ADMIN_EMAIL } from "@/lib/locked-admin";

type Params = { params: Promise<{ id: string }> };

type UpdateBody = {
  email?: string;
  password?: string;
  modules?: string[];
  active?: boolean;
};

function isModuleKey(value: ReturnType<typeof normalizeModule>): value is NonNullable<ReturnType<typeof normalizeModule>> {
  return value !== null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const ok = await ensureUserManagementAccess();
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const body = (await request.json()) as UpdateBody;
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Usuario nao encontrado." }, { status: 404 });
    }
    if (isLockedPrimaryAdminEmail(existing.email)) {
      return NextResponse.json(
        { message: `O usuario ${LOCKED_PRIMARY_ADMIN_EMAIL} e protegido e nao pode ser alterado.` },
        { status: 403 }
      );
    }
    const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
    if (email && isLockedPrimaryAdminEmail(email) && email !== existing.email) {
      return NextResponse.json({ message: "Nao e permitido associar outro usuario a este e-mail reservado." }, { status: 403 });
    }
    const password = body.password ? String(body.password).trim() : undefined;
    const modules = Array.isArray(body.modules)
      ? body.modules.map((value) => normalizeModule(String(value))).filter(isModuleKey)
      : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          email,
          active: body.active,
          passwordHash: password ? await hashPassword(password) : undefined,
        },
      });

      if (modules) {
        await tx.userModuleAccess.deleteMany({ where: { userId: user.id } });
        if (modules.length > 0) {
          await tx.userModuleAccess.createMany({
            data: modules.map((moduleKey) => ({
              userId: user.id,
              module: toPrismaModule(moduleKey),
              canRead: true,
              canWrite: true,
            })),
          });
        }
      }

      const moduleAccess = await tx.userModuleAccess.findMany({ where: { userId: user.id } });
      return {
        id: user.id,
        email: user.email,
        active: user.active,
        modules: moduleAccess.filter((item) => item.canRead).map((item) => item.module.toLowerCase()),
      };
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel atualizar usuario.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const ok = await ensureUserManagementAccess();
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Usuario nao encontrado." }, { status: 404 });
    }
    if (isLockedPrimaryAdminEmail(existing.email)) {
      return NextResponse.json(
        { message: `O usuario ${LOCKED_PRIMARY_ADMIN_EMAIL} e protegido e nao pode ser excluido.` },
        { status: 403 }
      );
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel excluir usuario.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
