import { notFound } from "next/navigation";
import { CatalogDetail } from "@/components/cards/catalog-detail";
import { getPublicItem } from "@/lib/public-content";
import { isLocale } from "@/lib/i18n/dictionary";
export default async function OpportunityDetailPage({ params }: PageProps<"/[locale]/opportunities/[slug]">) { const { locale, slug } = await params; if (!isLocale(locale)) notFound(); const item = await getPublicItem(slug, "opportunity"); if (!item) notFound(); return <CatalogDetail item={item} locale={locale} />; }
