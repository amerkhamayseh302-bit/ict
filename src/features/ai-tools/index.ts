import { getCatalogItems, type Locale } from "@/features/catalog";
export const getAiTools = (locale: Locale = "ar", query = "", category = "") => getCatalogItems("ai-tool", locale, query, category);
