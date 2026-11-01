import { getCatalogItems, type Locale } from "@/features/catalog";
export const getOpportunities = (locale: Locale = "ar", query = "", category = "") => getCatalogItems("opportunity", locale, query, category);
