import { Search } from "lucide-react";
import type { CatalogItem, CatalogType, Locale } from "@/features/catalog";
import { CatalogCard } from "@/components/cards/catalog-card";
import { getCategories, getCatalogItems, typeInfo } from "@/features/catalog";
import { getDictionary } from "@/lib/i18n/dictionary";

export function CatalogList({ items, type, locale, query = "", category = "", categories: suppliedCategories }: { items: CatalogItem[]; type?: CatalogType; locale: Locale; query?: string; category?: string; categories?: string[] }) {
  const t = getDictionary(locale);
  const categories = suppliedCategories ?? (type ? getCategories(type, locale) : [...new Set(getCatalogItems(undefined, locale).map((item) => locale === "en" ? item.categoryEn : item.category))]);
  return <>
    <form action={`/${locale}/${type ? typeInfo[type].path : "search"}`} className="filter-bar">
      <label className="search-field"><Search size={18} /><span className="sr-only">{t.search}</span><input name="q" defaultValue={query} placeholder={t.search} /></label>
      <select name="category" defaultValue={category} aria-label={t.allCategories}><option value="">{t.allCategories}</option>{categories.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      <button className="button button-dark" type="submit">{t.searchButton}</button>
    </form>
    {items.length ? <div className="catalog-grid">{items.map((item) => <CatalogCard item={item} locale={locale} key={item.slug} />)}</div> : <div className="empty-state">{t.empty}</div>}
  </>;
}
