import { catalog, type CatalogItem, type CatalogType, type Locale } from "@/features/catalog";
import { readContent } from "@/lib/local-content";

async function allPublicRecords(): Promise<CatalogItem[]> {
  try {
    return (await readContent()).filter((item) => item.status === "published");
  } catch {
    return catalog;
  }
}

export async function getPublicItems(type?: CatalogType, locale: Locale = "ar", query = "", category = "") {
  const records = await allPublicRecords();
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  return records.filter((item) => {
    if (type && item.type !== type) return false;
    const selectedCategory = locale === "en" ? item.categoryEn : item.category;
    if (category && selectedCategory !== category) return false;
    if (!normalizedQuery) return true;
    const text = [item.title, item.titleEn, item.summary, item.summaryEn, item.category, item.categoryEn, ...item.tags].join(" ").toLocaleLowerCase(locale);
    return text.includes(normalizedQuery);
  });
}

export async function getPublicItem(slug: string, type?: CatalogType) {
  return (await allPublicRecords()).find((item) => item.slug === slug && (!type || item.type === type)) ?? null;
}
