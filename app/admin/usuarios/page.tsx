import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/session";
import { AdminNav } from "@/components/admin-nav";
import { AdminUsersManager } from "@/components/admin-users-manager";
import { LOCKED_PRIMARY_ADMIN_EMAIL } from "@/lib/locked-admin";
import { ALL_MODULES_FOR_MASTER, type AppModule } from "@/lib/modules";

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const hasUsuarios =
    session.role === "master" || Boolean(session.modules?.includes("usuarios"));
  if (!hasUsuarios) redirect("/admin");

  const modules: AppModule[] =
    session.role === "master" ? [...ALL_MODULES_FOR_MASTER] : session.modules ?? [];

  const users = await prisma.user.findMany({
    include: { moduleAccess: true },
    orderBy: { createdAt: "desc" },
  });

  const initialUsers = users.map((user: (typeof users)[number]) => ({
    id: user.id,
    email: user.email,
    active: user.active,
    modules: user.moduleAccess.filter((item) => item.canRead).map((item) => item.module.toLowerCase()),
  }));

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <AdminNav modules={modules} />
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">E-mails cadastrados</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50 sm:text-3xl">Gerenciamento de usuários</h1>
          <p className="mt-2 text-sm text-slate-300">
            Cadastre e edite contas por e-mail, senha e módulos liberados no gerencial.
          </p>
        </header>
        <AdminUsersManager initialUsers={initialUsers} lockedPrimaryEmail={LOCKED_PRIMARY_ADMIN_EMAIL} />
      </div>
    </main>
  );
}
