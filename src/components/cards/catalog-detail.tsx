import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpLeft,
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import type { CatalogItem, Locale } from "@/features/catalog";
import { typeInfo } from "@/features/catalog";
import { safeExternalUrl } from "@/lib/urls";

export function CatalogDetail({
  item,
  locale,
}: {
  item: CatalogItem;
  locale: Locale;
}) {
  const title = locale === "en" ? item.titleEn : item.title;
  const summary = locale === "en" ? item.summaryEn : item.summary;
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const externalUrl = safeExternalUrl(item.url);
  const startAt = item.startAt
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-PS" : "en", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Hebron",
      }).format(new Date(item.startAt))
    : "";
  return (
    <main className="container page-main detail-main">
      <Link
        className="back-link"
        href={`/${locale}/${typeInfo[item.type].path}`}
      >
        <Arrow size={16} />
        {locale === "ar" ? "العودة للقائمة" : "Back to directory"}
      </Link>
      <article className="detail-card">
        {item.imageUrl && (
          <Image
            className="detail-cover-image"
            src={item.imageUrl}
            alt=""
            width={1200}
            height={680}
            unoptimized
          />
        )}
        <span className="category-pill">
          {locale === "en" ? item.categoryEn : item.category}
        </span>
        <h1>{title}</h1>
        {item.type === "event" && startAt && (
          <p className="event-detail-date">
            <CalendarDays size={17} />
            {startAt}
          </p>
        )}
        <p className="detail-summary">{summary}</p>
        <div className="detail-tags">
          {item.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        {externalUrl && (
          <a
            className="button button-primary"
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
          >
            {locale === "ar" ? "افتح المصدر الخارجي" : "Open external source"}
            <ExternalLink size={17} />
          </a>
        )}
        <p className="source-note">
          {locale === "ar"
            ? "تحقق من تفاصيل المصدر قبل التسجيل أو مشاركة بياناتك."
            : "Verify details on the source website before registering or sharing personal information."}
        </p>
      </article>
    </main>
  );
}
