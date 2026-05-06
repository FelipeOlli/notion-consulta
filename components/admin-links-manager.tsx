"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NotionLink } from "@/lib/types";

type Props = {
  initialLinks: NotionLink[];
  /** Se false, somente consulta (ti@ / LOCKED_PRIMARY_ADMIN_EMAIL pode incluir, editar e excluir). */
  canEditAcessos?: boolean;
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

export function AdminLinksManager({ initialLinks, canEditAcessos = true }: Props) {
  const readOnlyAcessos = !canEditAcessos;
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
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
    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnlyAcessos) {
      setError("Somente o administrador principal pode incluir ou alterar acessos.");
      return;
    }
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
      setEditingId(null);
      setForm(emptyForm);
      setError("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Falha de conexao. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (readOnlyAcessos) {
      setError("Somente o administrador principal pode excluir acessos.");
      return;
    }
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

  const cardStyle: React.CSSProperties = {
    background: "rgba(8,15,26,0.7)",
    border: "1px solid rgba(29,127,229,0.15)",
    borderRadius: "16px",
    padding: "20px 24px",
  };

  const inputCls =
    "ds-input disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section className="space-y-6">
      {readOnlyAcessos ? (
        <div
          className="rounded-2xl p-4 text-sm"
          style={{
            background: "rgba(255,170,0,0.07)",
            border: "1px solid rgba(255,170,0,0.3)",
          }}
        >
          <p className="font-semibold text-[#ffaa00]">Acessos em modo somente leitura</p>
          <p className="mt-1" style={{ color: "var(--onity-dark-text-muted)" }}>
            Apenas o administrador principal pode incluir, editar ou excluir acessos. Voce pode consultar e buscar na lista.
          </p>
        </div>
      ) : null}

      {!readOnlyAcessos && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (showForm && !editingId) {
                resetForm();
              } else if (!showForm) {
                setEditingId(null);
                setForm(emptyForm);
                setError("");
                setShowForm(true);
              }
            }}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
            style={
              showForm && !editingId
                ? { background: "rgba(29,127,229,0.2)", border: "1px solid rgba(29,127,229,0.5)", color: "#4da3ff" }
                : { background: "rgba(29,127,229,0.1)", border: "1px solid rgba(29,127,229,0.3)", color: "#1d7fe5" }
            }
          >
            {showForm && !editingId ? "✕ Cancelar" : "+ Novo link"}
          </button>
        </div>
      )}

      {(showForm || editingId) && !readOnlyAcessos && (
        <div style={cardStyle}>
          <h2 className="mb-4 text-lg font-semibold text-white">
            {editingId ? "Editar link" : "Novo link"}
          </h2>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Titulo"
              required
              className={inputCls}
            />
            <input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Categoria (texto livre)"
              required
              className={inputCls}
            />
            <input
              value={form.url}
              onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="https://..."
              required
              className={`${inputCls} md:col-span-2`}
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Descricao curta"
              rows={3}
              className="ds-input md:col-span-2 h-auto py-2.5"
            />
            <label className="inline-flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                className="size-4 rounded accent-[#1d7fe5]"
              />
              Link ativo na pagina publica
            </label>

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary rounded-xl px-5 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Salvando..." : editingId ? "Salvar alteracoes" : "Cadastrar link"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition"
                style={{ border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" }}
              >
                Cancelar
              </button>
            </div>
            {error ? (
              <p className="md:col-span-2 text-sm font-medium" style={{ color: "#ff453a" }}>
                {error}
              </p>
            ) : null}
          </form>
        </div>
      )}

      <div style={cardStyle}>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar no gerencial..."
            className="ds-input"
          />
          <div className="flex items-center text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
            Total: {filtered.length}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="rounded-xl p-4"
              style={{ background: "rgba(3,8,15,0.5)", border: "1px solid rgba(29,127,229,0.1)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-label text-xs mb-0.5">{item.category}</p>
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>
                    {item.description}
                  </p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex text-sm font-medium transition-colors"
                    style={{ color: "#1d7fe5" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#4da3ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#1d7fe5")}
                  >
                    Abrir link →
                  </a>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={
                    item.active
                      ? { background: "rgba(0,204,102,0.12)", color: "#00cc66", border: "1px solid rgba(0,204,102,0.25)" }
                      : { background: "rgba(107,138,170,0.1)", color: "#6b8aaa", border: "1px solid rgba(107,138,170,0.2)" }
                  }
                >
                  {item.active ? "Ativo" : "Oculto"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  disabled={readOnlyAcessos}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ border: "1px solid rgba(29,127,229,0.2)", background: "rgba(8,15,26,0.5)" }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={readOnlyAcessos}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ border: "1px solid rgba(255,69,58,0.35)", color: "#ff453a", background: "rgba(8,15,26,0.5)" }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center text-sm"
              style={{
                border: "1px dashed rgba(29,127,229,0.18)",
                color: "var(--onity-dark-text-muted)",
              }}
            >
              Nenhum link cadastrado.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
