import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { IungoDashboard } from "@/components/iungo-dashboard";
import { prisma } from "@/lib/prisma";

const SEED_RAMAIS = [
  { ramal: "201", status: "ATIVO" as const, login: "cfrj.mobi.201", senha: "Iungo@2024", numero: "(21) 2038-3351", funcionarios: ["Karina Barbara Cindra Martins Aprigio"] },
  { ramal: "202", status: "ATIVO" as const, login: "cfrj.mobi.202", senha: "Iungo@2024", numero: "(21) 2038-3352", funcionarios: ["Guilherme Costa Monteiro"] },
  { ramal: "203", status: "ATIVO" as const, login: "cfrj.mobi.203", senha: "Iungo@2024", numero: "(21) 2038-3353", funcionarios: ["Lucas Oliveira Carneiro"] },
  { ramal: "204", status: "ATIVO" as const, login: "cfrj.mobi.204", senha: "Iungo@2024", numero: "(21) 2038-3354", funcionarios: ["Alessandro Guimarães Lustoza"] },
  { ramal: "205", status: "ATIVO" as const, login: "cfrj.mobi.205", senha: "Iungo@2024", numero: "(21) 2038-3355", funcionarios: ["Erilene Garcia De Lima"] },
  { ramal: "206", status: "ATIVO" as const, login: "cfrj.mobi.206", senha: "Iungo@2024", numero: "(21) 2038-8016", funcionarios: ["Larissa Cristina De Almeida Brandao"] },
  { ramal: "207", status: "ATIVO" as const, login: "cfrj.mobi.207", senha: "Iungo@2024", numero: "(21) 2038-8017", funcionarios: ["Lydia Cristina Batista Fernandes Soares", "Fernanda Barreto dos Santos"] },
  { ramal: "208", status: "ATIVO" as const, login: "cfrj.mobi.208", senha: "Iungo@2024", numero: "(21) 2038-8036", funcionarios: ["Sheila Ferreira Da Silva"] },
  { ramal: "209", status: "ATIVO" as const, login: "cfrj.mobi.209", senha: "Iungo@2024", numero: "(21) 2038-8038", funcionarios: ["Jakson Da Silva Quinino De Melo", "Felipe Oliveira Rodrigues"] },
  { ramal: "210", status: "ATIVO" as const, login: "cfrj.mobi.210", senha: "Iungo@2024", numero: "(11) 5200-0428", funcionarios: ["Luiz Otavio Meinicke Mesquita"] },
  { ramal: "211", status: "ATIVO" as const, login: "cfrj.mobi.211", senha: "cfrj@2025", numero: "(21) 3900-7611", funcionarios: ["Marcelle Pereira Baptista"] },
  { ramal: "212", status: "ATIVO" as const, login: "cfrj.mobi.212", senha: "cfrj@2025", numero: "(21) 3900-7612", funcionarios: ["Joeane Almeida de Lima"] },
  { ramal: "213", status: "ATIVO" as const, login: "cfrj.mobi.213", senha: "cfrj@2025", numero: "(21) 3900-7613", funcionarios: ["Yasmim Duque Conrado Ferreira"] },
  { ramal: "214", status: "ATIVO" as const, login: "cfrj.mobi.214", senha: "cfrj@2025", numero: "(21) 3900-7614", funcionarios: ["Melissa De Paula Souza Soares Ferreira"] },
  { ramal: "215", status: "ATIVO" as const, login: "cfrj.mobi.215", senha: "cfrj@2025", numero: "(21) 3900-7615", funcionarios: ["Maria Eduarda Da Silva Paulino"] },
  { ramal: "216", status: "ATIVO" as const, login: "cfrj.mobi.216", senha: "cfrj@2025", numero: "(21) 3512-4143", funcionarios: ["Vitória Mendes Da Silva"] },
  { ramal: "217", status: "ATIVO" as const, login: "cfrj.mobi.217", senha: "Iungo@2025", numero: "(21) 3512-4142", funcionarios: [] },
  { ramal: "218", status: "ATIVO" as const, login: "cfrj.mobi.218", senha: "Iungo@2026", numero: "(21) 3512-4144", funcionarios: [] },
  { ramal: "219", status: "ATIVO" as const, login: "cfrj.mobi.219", senha: "Iungo@2026", numero: "(21) 3513-0647", funcionarios: [] },
  { ramal: "220", status: "ATIVO" as const, login: "cfrj.mobi.220", senha: "Iungo@2026", numero: "(21) 3513-0903", funcionarios: ["Ana Luiza Veras da Silva", "Lydia Cristina Batista Fernandes Soares"] },
  { ramal: "221", status: "INATIVO" as const, login: "cfrj.mobi.220", senha: "Iungo@2026", numero: "(21) 2242-5981", funcionarios: [] },
];

export default async function IungoPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("iungo" as AppModule)) redirect("/admin");

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : (session.modules ?? []);
  const isMaster = session.role === "master";

  // Seed na primeira visita
  const total = await prisma.iungoRamal.count();
  if (total === 0) {
    await prisma.iungoRamal.createMany({ data: SEED_RAMAIS });
  }

  return (
    <main className="relative z-10 min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />

        <header className="mt-8 mb-8">
          <p className="section-label">IUNGO</p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Ramais PABX</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Controle de ramais ativos, credenciais de acesso, números e funcionários vinculados.
          </p>
        </header>

        {/* Card de suporte do provedor */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--onity-dark-text-muted)" }}>
            Suporte IUNGO
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <a
              href="tel:08000421496"
              className="flex items-center gap-2 text-sm text-white hover:text-[#4da3ff] transition-colors"
            >
              <span>📞</span>
              <span>0800 042 1496</span>
            </a>
            <a
              href="mailto:suporte@iungo.cloud"
              className="flex items-center gap-2 text-sm text-white hover:text-[#4da3ff] transition-colors"
            >
              <span>🖥️</span>
              <span>suporte@iungo.cloud</span>
            </a>
            <a
              href="https://wa.me/551152000052"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white hover:text-[#4da3ff] transition-colors"
            >
              <span>📲</span>
              <span>11 5200-0052</span>
            </a>
          </div>
        </div>

        <IungoDashboard isMaster={isMaster} />
      </div>
    </main>
  );
}
