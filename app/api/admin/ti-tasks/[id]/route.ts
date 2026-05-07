import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

async function auth() {
  const session = await getAdminSession();
  if (!session) return null;
  return session;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const { title, responsible, status, taskType, raciRef, description } = body as {
    title?: string;
    responsible?: string;
    status?: string;
    taskType?: string;
    raciRef?: string | null;
    description?: string | null;
  };

  const task = await prisma.tiTask.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ message: "Tarefa não encontrada." }, { status: 404 });

  const updated = await prisma.tiTask.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(responsible !== undefined && { responsible }),
      ...(status !== undefined && { status: status as "TODO" | "DOING" | "DONE" }),
      ...(taskType !== undefined && { taskType: taskType as "MANUAL" | "AUTOMACAO" | "DELEGACAO" }),
      ...(raciRef !== undefined && { raciRef: raciRef || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.role !== "master") return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const { id } = await params;

  const task = await prisma.tiTask.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ message: "Tarefa não encontrada." }, { status: 404 });

  await prisma.tiTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
