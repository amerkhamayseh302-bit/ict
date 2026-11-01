import { CatalogPage } from "@/components/search/catalog-page";
import { isLocale } from "@/lib/i18n/dictionary";
import { notFound } from "next/navigation";
import { singleParam } from "@/lib/search/catalog";
export default async function EventsPage({ params, searchParams }: PageProps<"/[locale]/events">) { const [{ locale }, filters] = await Promise.all([params, searchParams]); if (!isLocale(locale)) notFound(); return <CatalogPage type="event" locale={locale} query={singleParam(filters.q)} category={singleParam(filters.category)} />; }
