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
      console.error("[home] Nao foi possivel carregar links publicos (ex.: disco somente leitura em data/).", error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black">
      <main>
        <header className="border-b border-slate-800/80 bg-black/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Portal corporativo</p>
              <h1 className="mt-1 text-xl font-bold text-slate-50 sm:text-2xl">Informações e acessos da empresa</h1>
            </div>
            <HeaderActions isAuthenticated={Boolean(session)} />
          </div>
        </header>

        <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 text-slate-100 shadow-xl sm:p-10">
              <p className="text-sm uppercase tracking-widest text-sky-400">Área autenticada</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Consulte recursos, senhas e referências liberados para a sua equipe
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Use suas credenciais ao lado. Todos entram na mesma Central da empresa (gerencial); o que muda são apenas
                os módulos liberados ao seu e-mail — Acessos, Certificados, Financeiro ou cadastro de usuários, conforme
                permissão.
              </p>
              <ul className="mt-6 list-inside list-disc space-y-2 text-sm text-slate-400">
                <li>Na página inicial você consulta recursos públicos liberados após entrar.</li>
                <li>Cada pessoa enxerga somente o que foi autorizado para o seu login.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Entrar</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-50">Acesso com e-mail e senha</h3>
              <p className="mt-2 text-sm text-slate-300">
                Use as credenciais fornecidas pela TI. A sessão é protegida por cookie seguro no navegador.
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
