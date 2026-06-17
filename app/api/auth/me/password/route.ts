import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!session.userId) {
    return NextResponse.json(
      { message: "Este usuário não possui registro no banco de dados. A troca de senha não é suportada." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const currentPassword = String(body?.currentPassword ?? "").trim();
    const newPassword = String(body?.newPassword ?? "").trim();
    const confirmPassword = String(body?.confirmPassword ?? "").trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ message: "Todos os campos são obrigatórios." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: "A nova senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ message: "A confirmação da nova senha não confere." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ message: "Usuário não encontrado no banco de dados." }, { status: 400 });
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ message: "Senha atual incorreta." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Não foi possível atualizar a senha." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
