import { getCatalogItems, type Locale } from "@/features/catalog";
export const getEvents = (locale: Locale = "ar", query = "", category = "") => getCatalogItems("event", locale, query, category);
