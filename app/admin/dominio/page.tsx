import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { DominioDashboard } from "@/components/dominio-dashboard";
import { prisma } from "@/lib/prisma";

export default async function DominioPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("dominio" as AppModule)) redirect("/admin");

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  const sscs = await prisma.dominioSsc.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { updates: { where: { visto: false } } } },
    },
  });

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">Domínio</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Acompanhamento de SSC</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Cadastre chamados do portal DOMÍNIO/ONVIO e monitore respostas recebidas em{" "}
            <span className="text-white/60">ti@cfcontabilidade.com</span>.
          </p>
        </header>

        <DominioDashboard initialSscs={sscs} />
      </div>
    </main>
  );
}
