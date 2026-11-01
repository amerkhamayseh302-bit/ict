import type { CatalogType, Locale } from "@/features/catalog";
import { typeInfo } from "@/features/catalog";
import { CatalogList } from "@/components/search/catalog-list";
import { getPublicItems } from "@/lib/public-content";
import { readCategories } from "@/lib/local-content";

export async function CatalogPage({ type, locale, query = "", category = "" }: { type: CatalogType; locale: Locale; query?: string; category?: string }) {
  const info = typeInfo[type];
  const [allItems, categoryMap] = await Promise.all([getPublicItems(type, locale), readCategories()]);
  const items = await getPublicItems(type, locale, query, category);
  const categories = [...new Set([...categoryMap[type], ...allItems.map((item) => locale === "en" ? item.categoryEn : item.category)].filter(Boolean))];
  return <main className="container page-main"><div className="page-heading"><span className="eyebrow">ICT DIRECTORY</span><h1>{locale === "en" ? info.titleEn : info.title}</h1><p>{locale === "en" ? info.descriptionEn : info.description}</p></div><CatalogList items={items} type={type} locale={locale} query={query} category={category} categories={categories} /></main>;
}
