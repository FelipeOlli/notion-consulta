import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { DominioTabs } from "@/components/dominio-tabs";
import { prisma } from "@/lib/prisma";

export default async function DominioPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("dominio" as AppModule))
    redirect("/admin");

  const modules: AppModule[] =
    session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  const [sscs, tickets, badgeColors, statusOptions, sistemaOrigemOptions] = await Promise.all([
    prisma.dominioSsc.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { updates: { where: { visto: false } } } },
      },
    }),
    prisma.transbordoTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { comments: true } },
        statusColor: true,
      },
    }),
    prisma.transbordoBadgeColor.findMany({ orderBy: { label: "asc" } }),
    prisma.transbordoStatusOption.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.transbordoSistemaOrigemOption.findMany({ orderBy: { label: "asc" } }),
  ]);

  const ticketsSerialized = tickets.map((t) => ({
    ...t,
    dConcluido: t.dConcluido?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    statusColor: t.statusColor
      ? { ...t.statusColor, createdAt: t.statusColor.createdAt.toISOString() }
      : null,
  }));

  const colorsSerialized = badgeColors.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  }));

  const statusSerialized = statusOptions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  const sistemaOrigemOptionsSerialized = sistemaOrigemOptions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">Domínio</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Portal DOMÍNIO/ONVIO</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Acompanhe SSCs e tickets de migração de franquias.
          </p>
        </header>

        <DominioTabs
          initialSscs={sscs}
          initialTickets={ticketsSerialized}
          initialBadgeColors={colorsSerialized}
          initialStatusOptions={statusSerialized}
          initialSistemaOrigemOptions={sistemaOrigemOptionsSerialized}
          isMaster={session.role === "master"}
        />
      </div>
    </main>
  );
}
