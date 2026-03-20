import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureModuleAccess } from "@/lib/admin-auth";
import {
  competenceFromYearMonth,
  parseGoogleWorkspaceUsersJson,
  parseTimeIsMoneyCollaboratorsCsv,
} from "@/lib/financeiro-import";
import { serverNameForKey, serviceKeyFromForm } from "@/lib/financeiro-services";

export async function POST(request: NextRequest) {
  const ok = await ensureModuleAccess("financeiro");
  if (!ok) return NextResponse.json({ message: "Nao autorizado." }, { status: 401 });

  try {
    const form = await request.formData();
    const serviceKeyRaw = String(form.get("serviceKey") ?? "").trim();
    const competenceRaw = String(form.get("competence") ?? "").trim();
    const file = form.get("file");

    const serviceKey = serviceKeyFromForm(serviceKeyRaw);
    if (!serviceKey) {
      return NextResponse.json(
        { message: "Servico invalido. Use: cf-com | cf-com-br | time-is-money." },
        { status: 400 }
      );
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Arquivo obrigatorio." }, { status: 400 });
    }

    const competence = competenceFromYearMonth(competenceRaw);
    const serverName = serverNameForKey(serviceKey);
    const server = await prisma.emailServer.findUnique({ where: { name: serverName } });
    if (!server) {
      return NextResponse.json(
        { message: `Servico "${serverName}" nao encontrado no banco. Execute o seed ou cadastre o EmailServer.` },
        { status: 400 }
      );
    }

    const text = await file.text();
    let totalUsers: number;
    let activeUsers: number | null;
    let source: "GOOGLE_JSON" | "TIM_CSV";

    if (serviceKey === "timeIsMoney") {
      const parsed = parseTimeIsMoneyCollaboratorsCsv(text);
      totalUsers = parsed.totalUsers;
      activeUsers = null;
      source = "TIM_CSV";
    } else {
      const parsed = parseGoogleWorkspaceUsersJson(text);
      totalUsers = parsed.totalUsers;
      activeUsers = parsed.activeUsers;
      source = "GOOGLE_JSON";
    }

    const snapshot = await prisma.serviceUserSnapshot.upsert({
      where: {
        serverId_competence: { serverId: server.id, competence },
      },
      create: {
        serverId: server.id,
        competence,
        totalUsers,
        activeUsers,
        source,
        fileName: file.name || null,
      },
      update: {
        totalUsers,
        activeUsers,
        source,
        fileName: file.name || null,
      },
      include: { server: true },
    });

    return NextResponse.json({
      data: {
        id: snapshot.id,
        serverId: snapshot.serverId,
        serverName: snapshot.server.name,
        competence: snapshot.competence.toISOString(),
        totalUsers: snapshot.totalUsers,
        activeUsers: snapshot.activeUsers,
        source: snapshot.source,
        fileName: snapshot.fileName,
        createdAt: snapshot.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel importar.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
