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

export function CatalogCard({
  item,
  locale,
}: {
  item: CatalogItem;
  locale: Locale;
}) {
  const title = locale === "en" ? item.titleEn : item.title;
  const summary = locale === "en" ? item.summaryEn : item.summary;
  const category = locale === "en" ? item.categoryEn : item.category;
  const label = locale === "en" ? item.labelEn : item.label;
  const path = typeInfo[item.type].path;
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const startAt = item.startAt
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-PS" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Hebron",
      }).format(new Date(item.startAt))
    : "";

  return (
    <article className="catalog-card">
      {item.imageUrl && (
        <Image
          className="catalog-card-image"
          src={item.imageUrl}
          alt=""
          width={640}
          height={360}
          unoptimized
          loading="lazy"
        />
      )}
      <div className="card-topline">
        <span className="category-pill">{category}</span>
        {label && <span className="card-label">{label}</span>}
      </div>
      <h3>
        <Link href={`/${locale}/${path}/${item.slug}`}>{title}</Link>
      </h3>
      {item.type === "event" && startAt && (
        <p className="event-card-date">
          <CalendarDays size={14} />
          {startAt}
        </p>
      )}
      <p>{summary}</p>
      <div className="card-actions">
        <Link className="text-link" href={`/${locale}/${path}/${item.slug}`}>
          {locale === "ar" ? "التفاصيل" : "Details"}
          <Arrow size={16} />
        </Link>
        <a
          className="icon-link"
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${locale === "ar" ? "افتح" : "Open"} ${title}`}
        >
          <ExternalLink size={17} />
        </a>
      </div>
    </article>
  );
}
