"use client";

import { useMemo, useState } from "react";
import { NotionLink } from "@/lib/types";

type Props = {
  links: NotionLink[];
};

export function PublicLinks({ links }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const categories = useMemo(() => {
    const values = new Set(links.map((item) => item.category));
    return ["Todos", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [links]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return links.filter((item) => {
      const inCategory = category === "Todos" || item.category === category;
      const inText =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term);
      return inCategory && inText;
    });
  }, [links, search, category]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Filters */}
      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, descrição ou categoria..."
          className="ds-input"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="ds-input md:min-w-44"
          style={{ cursor: "pointer" }}
        >
          {categories.map((item) => (
            <option key={item} value={item} style={{ background: "#0d1829", color: "#ffffff" }}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            border: "1px dashed rgba(29,127,229,0.2)",
            background: "rgba(8,15,26,0.4)",
          }}
        >
          <p className="text-base" style={{ color: "var(--onity-dark-text-muted)" }}>
            Nenhum link encontrado com os filtros atuais.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="glass-card group rounded-2xl p-5 flex flex-col">
              <p
                className="mb-3 inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: "rgba(29,127,229,0.12)",
                  color: "#1d7fe5",
                  border: "1px solid rgba(29,127,229,0.2)",
                }}
              >
                {item.category}
              </p>
              <h2 className="text-base font-semibold text-white">{item.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: "var(--onity-dark-text-muted)" }}>
                {item.description}
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold transition-colors"
                style={{ color: "#1d7fe5" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4da3ff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1d7fe5")}
              >
                Abrir recurso →
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
