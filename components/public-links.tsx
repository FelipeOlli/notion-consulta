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
      <div className="mb-8 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por titulo, descricao ou categoria..."
          className="h-12 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm text-slate-100 outline-none ring-0 transition focus:border-slate-300"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-12 min-w-40 rounded-xl border border-slate-600 bg-slate-900 px-4 text-sm text-slate-100 outline-none transition focus:border-slate-300"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
          <p className="text-base text-slate-300">Nenhum link encontrado com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg"
            >
              <p className="mb-3 inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                {item.category}
              </p>
              <h2 className="text-lg font-semibold text-slate-50">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.description}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center text-sm font-semibold text-sky-400 transition group-hover:text-sky-200"
              >
                Abrir no Notion
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
