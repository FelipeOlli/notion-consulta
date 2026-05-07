import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";

async function auth() {
  const session = await getAdminSession();
  if (!session) return null;
  return session;
}

const INITIAL_TASKS = [
  { code: "A-01", title: "Lastpass — auditoria de acessos", responsible: "andre", taskType: "MANUAL" as const, sortOrder: 1 },
  { code: "A-02", title: "SCRUMHUB — relatório 3 meses", responsible: "andre", taskType: "MANUAL" as const, sortOrder: 2 },
  { code: "A-05", title: "SIEG — montar processo", responsible: "andre", taskType: "MANUAL" as const, sortOrder: 3 },
  { code: "G-01", title: "Remover franquias", responsible: "gabriel", taskType: "MANUAL" as const, sortOrder: 4 },
  { code: "G-02", title: "Remover colaboradores", responsible: "gabriel", taskType: "MANUAL" as const, sortOrder: 5 },
  { code: "G-04", title: "Auxiliar Pedro", responsible: "gabriel", taskType: "DELEGACAO" as const, sortOrder: 6 },
  { code: "G-05", title: "Inventário de equipamentos", responsible: "gabriel", taskType: "MANUAL" as const, sortOrder: 7 },
  { code: "G-06", title: "Termo de responsabilidade", responsible: "gabriel", taskType: "MANUAL" as const, sortOrder: 8 },
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  // Auto-seed initial tasks if table is empty
  const count = await prisma.tiTask.count();
  if (count === 0) {
    await prisma.tiTask.createMany({ data: INITIAL_TASKS });
  }

  const tasks = await prisma.tiTask.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ data: tasks });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.role !== "master") return NextResponse.json({ message: "Não autorizado." }, { status: 401 });

  const body = await request.json();
  const { title, responsible, taskType, raciRef, description } = body as {
    title: string;
    responsible: string;
    taskType?: string;
    raciRef?: string;
    description?: string;
  };

  if (!title?.trim() || !responsible?.trim()) {
    return NextResponse.json({ message: "Título e responsável são obrigatórios." }, { status: 400 });
  }

  const maxOrder = await prisma.tiTask.aggregate({ _max: { sortOrder: true } });
  const nextOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  // Generate code based on responsible initial and next sequence
  const prefix = responsible.charAt(0).toUpperCase();
  const existing = await prisma.tiTask.count({ where: { code: { startsWith: prefix } } });
  const code = `${prefix}-${String(existing + 1).padStart(2, "0")}`;

  const task = await prisma.tiTask.create({
    data: {
      code,
      title: title.trim(),
      description: description?.trim() || null,
      responsible,
      taskType: (taskType as "MANUAL" | "AUTOMACAO" | "DELEGACAO") || "MANUAL",
      raciRef: raciRef || null,
      sortOrder: nextOrder,
    },
  });

  return NextResponse.json({ data: task }, { status: 201 });
}

export const dynamic = "force-dynamic";
