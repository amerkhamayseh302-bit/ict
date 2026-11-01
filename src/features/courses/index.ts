import { getCatalogItems, type Locale } from "@/features/catalog";
export const getCourses = (locale: Locale = "ar", query = "", category = "") => getCatalogItems("course", locale, query, category);
