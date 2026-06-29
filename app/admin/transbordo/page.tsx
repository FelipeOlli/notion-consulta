import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { TransbordoDashboard } from "@/components/transbordo-dashboard";
import { prisma } from "@/lib/prisma";

export default async function TransbordoPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("transbordo" as AppModule))
    redirect("/admin");

  const modules: AppModule[] =
    session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  const [tickets, badgeColors, statusOptions] = await Promise.all([
    prisma.transbordoTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { comments: true } },
        statusColor: true,
      },
    }),
    prisma.transbordoBadgeColor.findMany({ orderBy: { label: "asc" } }),
    prisma.transbordoStatusOption.findMany({ orderBy: { sortOrder: "asc" } }),
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

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">Transbordo</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Tickets de Migração
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Acompanhe o pipeline de migração de sistemas contábeis por franquia.
          </p>
        </header>

        <TransbordoDashboard
          initialTickets={ticketsSerialized}
          initialBadgeColors={colorsSerialized}
          initialStatusOptions={statusSerialized}
          isMaster={session.role === "master"}
        />
      </div>
    </main>
  );
}
