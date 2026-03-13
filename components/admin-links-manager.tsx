"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NotionLink } from "@/lib/types";

type Props = {
  initialLinks: NotionLink[];
};

type FormState = {
  title: string;
  description: string;
  url: string;
  category: string;
  active: boolean;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  url: "",
  category: "",
  active: true,
};

export function AdminLinksManager({ initialLinks }: Props) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return links;
    return links.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    });
  }, [query, links]);

  function startEdit(item: NotionLink) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      url: item.url,
      category: item.category,
      active: item.active,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const endpoint = editingId ? `/api/admin/links/${editingId}` : "/api/admin/links";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.message || "Nao foi possivel salvar.");
        return;
      }

      if (editingId) {
        setLinks((prev) => prev.map((item) => (item.id === editingId ? payload.data : item)));
      } else {
        setLinks((prev) => [payload.data, ...prev]);
      }
      resetForm();
      router.refresh();
    } catch {
      setError("Falha de conexao. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Deseja mesmo excluir este link?")) return;

    const response = await fetch(`/api/admin/links/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.message || "Nao foi possivel excluir.");
      return;
    }
    setLinks((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-50">
            {editingId ? "Editar link" : "Novo link do Notion"}
          </h2>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-400 hover:text-white"
          >
            Sair
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titulo"
            required
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <input
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Categoria (texto livre)"
            required
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <input
            value={form.url}
            onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
            placeholder="https://www.notion.so/..."
            required
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400 md:col-span-2"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Descricao curta"
            rows={3}
            className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 outline-none transition focus:border-slate-400 md:col-span-2"
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
              className="size-4 rounded border-slate-600 bg-slate-900"
            />
            Link ativo na pagina publica
          </label>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alteracoes" : "Cadastrar link"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:text-white"
              >
                Cancelar edicao
              </button>
            ) : null}
          </div>
          {error ? <p className="md:col-span-2 text-sm font-medium text-red-600">{error}</p> : null}
        </form>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm sm:p-6">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no painel..."
            className="h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition focus:border-slate-400"
          />
          <div className="flex items-center text-sm text-slate-300">Total: {filtered.length}</div>
        </div>

        <div className="space-y-3">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.category}</p>
                  <h3 className="text-base font-semibold text-slate-50">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-300">{item.description}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm font-medium text-sky-400 hover:text-sky-200"
                  >
                    Abrir link
                  </a>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.active ? "bg-emerald-900/60 text-emerald-300" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {item.active ? "Ativo" : "Oculto"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => startEdit(item)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-slate-300 hover:text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="rounded-lg border border-red-500/60 px-3 py-1.5 text-sm font-medium text-red-300 transition hover:border-red-400 hover:text-red-200"
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-300">
              Nenhum link cadastrado.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
