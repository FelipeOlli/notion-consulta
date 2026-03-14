import { HeaderActions } from "@/components/header-actions";
import { PublicLinks } from "@/components/public-links";
import { PublicLoginForm } from "@/components/public-login-form";
import { listPublicLinks } from "@/lib/store";
import { getAdminSession } from "@/lib/session";

export default async function Home() {
  const session = await getAdminSession();
  const links = session ? await listPublicLinks() : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <main>
        <header className="border-b border-slate-800/80 bg-black/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Notion Consulta</p>
              <h1 className="mt-1 text-xl font-bold text-slate-50 sm:text-2xl">Biblioteca de Links Notion</h1>
            </div>
            <HeaderActions role={session?.role ?? null} />
          </div>
        </header>

        <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)] items-start">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-slate-100 shadow-xl sm:p-10">
              <p className="text-sm uppercase tracking-widest text-sky-400">Curadoria privada</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Seus links do Notion em um painel de consulta elegante
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Para acessar os materiais, entre com seu usuario e senha. Depois do login, esta pagina exibe apenas os
                links que o usuario master marcou como ativos no painel master.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Acesso</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-50">Entrar para ver os links</h3>
              <p className="mt-2 text-sm text-slate-300">
                Use seu e-mail e senha de consulta (usuario visualizador) ou do master. O acesso cria uma sessao segura no navegador.
              </p>
              <div className="mt-5">
                <PublicLoginForm />
              </div>
            </div>
          </div>
        </section>

        {session ? <PublicLinks links={links} /> : null}
      </main>
    </div>
  );
}
