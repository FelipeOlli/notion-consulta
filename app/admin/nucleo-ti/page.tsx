import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { NucleoTiBoard, type TiTask } from "@/components/nucleo-ti-board";

export default async function NucleoTiPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("nucleo_ti" as AppModule)) redirect("/admin");

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);

  // Seed inicial se tabela vazia
  const count = await prisma.tiTask.count();
  if (count === 0) {
    await prisma.tiTask.createMany({
      data: [
        { code: "A-01", title: "Lastpass — auditoria de acessos", responsible: "andre", taskType: "MANUAL", sortOrder: 1 },
        { code: "A-02", title: "SCRUMHUB — relatório 3 meses", responsible: "andre", taskType: "MANUAL", sortOrder: 2 },
        { code: "A-05", title: "SIEG — montar processo", responsible: "andre", taskType: "MANUAL", sortOrder: 3 },
        { code: "G-01", title: "Remover franquias", responsible: "gabriel", taskType: "MANUAL", sortOrder: 4 },
        { code: "G-02", title: "Remover colaboradores", responsible: "gabriel", taskType: "MANUAL", sortOrder: 5 },
        { code: "G-04", title: "Auxiliar Pedro", responsible: "gabriel", taskType: "DELEGACAO", sortOrder: 6 },
        { code: "G-05", title: "Inventário de equipamentos", responsible: "gabriel", taskType: "MANUAL", sortOrder: 7 },
        { code: "G-06", title: "Termo de responsabilidade", responsible: "gabriel", taskType: "MANUAL", sortOrder: 8 },
      ],
    });
  }

  const raw = await prisma.tiTask.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  // Serializar datas para o client component
  const tasks: TiTask[] = raw.map((t) => ({
    ...t,
    description: t.description ?? null,
    raciRef: t.raciRef ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mb-10 border-b pb-8" style={{ borderColor: "#232936" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "#d4b25a", letterSpacing: 3 }}>
                CF Tecnologia · Núcleo TI
              </span>
              <h1 className="mt-3" style={{ fontFamily: "serif", fontWeight: 300, fontSize: 36, lineHeight: 1.05, letterSpacing: -1, color: "#ecedf2" }}>
                Controle de{" "}
                <em style={{ fontStyle: "italic", fontWeight: 400, color: "#d4b25a" }}>demandas</em>
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: "#8a93a8" }}>
                Gestão de tarefas por colaborador com matriz RACI embutida. Migre responsáveis, avance status e classifique cada demanda.
              </p>
            </div>
            <div className="text-right font-mono text-[11px] leading-7" style={{ color: "#555d72" }}>
              <div style={{ color: "#d4b25a" }}>v3.0 · 27.04.2026</div>
              <div>Coord. Felipe Oliveira</div>
              <div>Equipe: 4 pessoas</div>
            </div>
          </div>
        </header>

        <NucleoTiBoard initialTasks={tasks} isMaster={session.role === "master"} />
      </div>
    </main>
  );
}
