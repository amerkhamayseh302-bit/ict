import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { catalog, type CatalogItem, type CatalogType } from "@/features/catalog";

export type ContentRecord = CatalogItem & {
  id: string;
  status: "published" | "draft";
  updatedAt: string;
  imageUrl?: string;
};

const dataDirectory = path.join(process.cwd(), "data");
const contentFile = path.join(dataDirectory, "content.json");
const categoriesFile = path.join(dataDirectory, "categories.json");
const defaultCategories: Record<CatalogType, string[]> = {
  course: ["برمجة", "أمن سيبراني", "تطوير الويب", "قواعد البيانات", "شبكات"],
  "ai-tool": ["كتابة", "تصميم", "توليد الصور", "توليد الفيديو", "إنتاجية"],
  resource: ["برمجة", "أمن سيبراني", "ذكاء اصطناعي", "تصميم", "عام"],
  opportunity: ["وظائف", "تدريب", "منح", "تطوع"],
  event: ["ورش عمل", "لقاءات", "هاكاثون", "ندوات"],
};

function seededContent(): ContentRecord[] {
  return catalog.map((item) => ({ ...item, id: item.slug, status: "published", updatedAt: "2026-10-25" }));
}

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filename, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return fallback;
  }
}

export async function readContent() {
  return readJson<ContentRecord[]>(contentFile, seededContent());
}

export async function writeContent(items: ContentRecord[]) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(contentFile, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export async function readCategories(): Promise<Record<CatalogType, string[]>> {
  const seeded = Object.fromEntries((Object.keys(typeInfoLabels) as CatalogType[]).map((type) => [type, [...new Set([...(defaultCategories[type] ?? []), ...catalog.filter((item) => item.type === type).map((item) => item.category)])]])) as Record<CatalogType, string[]>;
  const stored = await readJson<Partial<Record<CatalogType, string[]>>>(categoriesFile, {});
  return Object.fromEntries((Object.keys(typeInfoLabels) as CatalogType[]).map((type) => [type, [...new Set([...(seeded[type] ?? []), ...(stored[type] ?? [])])]])) as Record<CatalogType, string[]>;
}

export async function writeCategories(categories: Record<CatalogType, string[]>) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(categoriesFile, `${JSON.stringify(categories, null, 2)}\n`, "utf8");
}

const typeInfoLabels: Record<CatalogType, string> = {
  course: "دورة",
  "ai-tool": "أداة ذكاء اصطناعي",
  resource: "مورد تقني",
  opportunity: "فرصة",
  event: "فعالية",
};
