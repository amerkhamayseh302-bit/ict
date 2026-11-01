import type { MetadataRoute } from "next";
import { typeInfo } from "@/features/catalog";
import { getSiteUrl } from "@/lib/urls";
import { getPublicItems } from "@/lib/public-content";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = getSiteUrl(); const routes = ["", "courses", "ai-tools", "resources", "opportunities", "events", "about", "contact", "search"]; const entries: MetadataRoute.Sitemap = []; for (const locale of ["ar", "en"] as const) { for (const route of routes) entries.push({ url: `${base}/${locale}${route ? `/${route}` : ""}`, changeFrequency: "weekly", priority: route ? 0.7 : 1 }); for (const item of await getPublicItems(undefined, locale)) entries.push({ url: `${base}/${locale}/${typeInfo[item.type].path}/${item.slug}`, changeFrequency: "monthly", priority: 0.6 }); } return entries; }
