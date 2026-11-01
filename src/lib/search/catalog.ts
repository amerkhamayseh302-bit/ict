import { getCatalogItems, type Locale } from "@/features/catalog";

export function searchCatalog(query: string, locale: Locale = "ar") {
  return getCatalogItems(undefined, locale, query);
}

export function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
