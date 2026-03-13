import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { CreateNotionLinkInput, NotionLink, UpdateNotionLinkInput } from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const linksPath = path.join(dataDir, "links.json");

const fallbackLinks: NotionLink[] = [
  {
    id: crypto.randomUUID(),
    title: "Guia de Processos",
    description: "Documentacao principal para o time com fluxos e responsabilidades.",
    url: "https://www.notion.so/",
    category: "Guias",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: "Templates Operacionais",
    description: "Colecao de templates para rotinas operacionais e checklists.",
    url: "https://www.notion.so/",
    category: "Templates",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(linksPath);
  } catch {
    await fs.writeFile(linksPath, JSON.stringify(fallbackLinks, null, 2), "utf-8");
  }
}

async function readLinks(): Promise<NotionLink[]> {
  await ensureDataFile();
  const content = await fs.readFile(linksPath, "utf-8");
  try {
    const parsed = JSON.parse(content) as NotionLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLinks(links: NotionLink[]) {
  await ensureDataFile();
  await fs.writeFile(linksPath, JSON.stringify(links, null, 2), "utf-8");
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeInput(input: CreateNotionLinkInput | UpdateNotionLinkInput) {
  const title = input.title?.trim();
  const description = input.description?.trim() ?? "";
  const url = input.url?.trim();
  const category = input.category?.trim() ?? "Geral";

  if (title !== undefined && !title) throw new Error("Titulo e obrigatorio.");
  if (url !== undefined && !isValidUrl(url)) throw new Error("URL invalida.");
  if (category.length > 60) throw new Error("Categoria muito longa.");

  return { title, description, url, category, active: input.active };
}

export async function listPublicLinks() {
  const links = await readLinks();
  return links
    .filter((item) => item.active)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAdminLinks() {
  const links = await readLinks();
  return links.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createLink(input: CreateNotionLinkInput) {
  const normalized = normalizeInput(input);
  if (!normalized.title || !normalized.url) {
    throw new Error("Titulo e URL sao obrigatorios.");
  }

  const now = new Date().toISOString();
  const newItem: NotionLink = {
    id: crypto.randomUUID(),
    title: normalized.title,
    description: normalized.description,
    url: normalized.url,
    category: normalized.category,
    active: normalized.active ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const current = await readLinks();
  await writeLinks([newItem, ...current]);
  return newItem;
}

export async function updateLink(id: string, input: UpdateNotionLinkInput) {
  const normalized = normalizeInput(input);
  const current = await readLinks();
  const index = current.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Link nao encontrado.");

  const existing = current[index];
  const updated: NotionLink = {
    ...existing,
    title: normalized.title ?? existing.title,
    description: normalized.description ?? existing.description,
    url: normalized.url ?? existing.url,
    category: normalized.category ?? existing.category,
    active: normalized.active ?? existing.active,
    updatedAt: new Date().toISOString(),
  };
  current[index] = updated;
  await writeLinks(current);
  return updated;
}

export async function removeLink(id: string) {
  const current = await readLinks();
  const next = current.filter((item) => item.id !== id);
  if (next.length === current.length) throw new Error("Link nao encontrado.");
  await writeLinks(next);
}
