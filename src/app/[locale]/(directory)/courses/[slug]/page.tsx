import { notFound } from "next/navigation";
import { CatalogDetail } from "@/components/cards/catalog-detail";
import { getPublicItem } from "@/lib/public-content";
import { isLocale } from "@/lib/i18n/dictionary";
export default async function CourseDetailPage({ params }: PageProps<"/[locale]/courses/[slug]">) { const { locale, slug } = await params; if (!isLocale(locale)) notFound(); const item = await getPublicItem(slug, "course"); if (!item) notFound(); return <CatalogDetail item={item} locale={locale} />; }
