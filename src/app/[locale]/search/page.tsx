import { CatalogList } from "@/components/search/catalog-list";
import { getPublicItems } from "@/lib/public-content";
import { readCategories } from "@/lib/local-content";
import { isLocale } from "@/lib/i18n/dictionary";
import { notFound } from "next/navigation";
import { singleParam } from "@/lib/search/catalog";

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const [{ locale }, filters] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const query = singleParam(filters.q);
  const category = singleParam(filters.category);
  const allItems = await getPublicItems(undefined, locale);
  const items = await getPublicItems(undefined, locale, query, category);
  const categoryMap = await readCategories();
  const categories = [...new Set([...Object.values(categoryMap).flat(), ...allItems.map((item) => locale === "en" ? item.categoryEn : item.category)].filter(Boolean))];
  return <main className="container page-main"><div className="page-heading"><span className="eyebrow">ICT SEARCH</span><h1>{locale === "ar" ? "ابحث في مصادر المجتمع" : "Search community resources"}</h1><p>{locale === "ar" ? "دورات وأدوات وموارد وفرص من مكان واحد." : "Courses, tools, resources, and opportunities in one place."}</p></div><CatalogList items={items} locale={locale} query={query} category={category} categories={categories} /></main>;
}
