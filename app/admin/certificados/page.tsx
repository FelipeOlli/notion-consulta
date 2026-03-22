import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { AdminCertificatesManager } from "@/components/admin-certificates-manager";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";
import { isLockedPrimaryAdminEmail } from "@/lib/locked-admin";

export default async function AdminCertificatesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "master" && !session.modules?.includes("certificados")) redirect("/admin");

  const [companies, certificates] = await Promise.all([
    prisma.company.findMany({ orderBy: { legalName: "asc" } }),
    prisma.digitalCertificate.findMany({
      include: { company: true },
      orderBy: { expiresAt: "asc" },
    }),
  ]);

  const modules: AppModule[] = session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : session.modules ?? [];
  const canEditCertificados = session.email ? isLockedPrimaryAdminEmail(session.email) : false;

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Modulo Certificados</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">Certificados digitais</h1>
          <p className="mt-2 text-sm text-slate-300">
            Inclusao, edicao e exclusao de certificados ficam apenas com o administrador principal; demais usuarios com
            modulo Certificados podem consultar, buscar e baixar arquivos.
          </p>
        </header>
        <AdminCertificatesManager
          initialCertificates={certificates}
          companies={companies}
          canEditCertificados={canEditCertificados}
        />
      </div>
    </main>
  );
}
