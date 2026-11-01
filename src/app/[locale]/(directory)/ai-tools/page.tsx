import { CatalogPage } from "@/components/search/catalog-page";
import { isLocale } from "@/lib/i18n/dictionary";
import { notFound } from "next/navigation";
import { singleParam } from "@/lib/search/catalog";
export default async function AiToolsPage({ params, searchParams }: PageProps<"/[locale]/ai-tools">) { const [{ locale }, filters] = await Promise.all([params, searchParams]); if (!isLocale(locale)) notFound(); return <CatalogPage type="ai-tool" locale={locale} query={singleParam(filters.q)} category={singleParam(filters.category)} />; }
