import { getCatalogItems, type Locale } from "@/features/catalog";
export const getResources = (locale: Locale = "ar", query = "", category = "") => getCatalogItems("resource", locale, query, category);
