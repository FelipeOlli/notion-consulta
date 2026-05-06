import { HeaderActions } from "@/components/header-actions";
import { PublicLinks } from "@/components/public-links";
import { PublicLoginForm } from "@/components/public-login-form";
import { listPublicLinks } from "@/lib/store";
import { getAdminSession } from "@/lib/session";

export default async function Home() {
  const session = await getAdminSession();

  let links: Awaited<ReturnType<typeof listPublicLinks>> = [];
  if (session) {
    try {
      links = await listPublicLinks();
    } catch (error) {
      console.error("[home] Nao foi possivel carregar links publicos.", error);
    }
  }

  return (
    <div className="relative z-10 min-h-screen">
      <main>
        {/* Header */}
        <header className="sticky top-0 z-50 glass-panel border-b" style={{ borderColor: "rgba(29,127,229,0.18)" }}>
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="section-label">Portal corporativo</p>
              <h1 className="mt-0.5 text-xl font-bold text-white sm:text-2xl">
                Informações e acessos da empresa
              </h1>
            </div>
            <HeaderActions isAuthenticated={Boolean(session)} />
          </div>
        </header>

        {!session ? (
          /* Login section */
          <section className="mx-auto flex w-full max-w-md flex-col px-4 pt-16 pb-4 sm:px-6">
            <div
              className="rounded-2xl p-7 sm:p-9"
              style={{
                background: "rgba(8,15,26,0.75)",
                border: "1px solid rgba(29,127,229,0.18)",
                backdropFilter: "blur(16px)",
              }}
            >
              <p className="section-label">Entrar</p>
              <h2 className="mt-2 text-xl font-bold text-white">Acesso com e-mail e senha</h2>
              <p className="mt-2 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
                Use as credenciais fornecidas pela TI. A sessão é protegida por cookie seguro no navegador.
              </p>
              <div className="mt-5">
                <PublicLoginForm />
              </div>
            </div>
          </section>
        ) : (
          <PublicLinks links={links} />
        )}
      </main>
    </div>
  );
}
