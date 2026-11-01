import Link from "next/link";
import type { Locale } from "@/features/catalog";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getCommunityLinks } from "@/lib/community-links";
import { safeExternalUrl } from "@/lib/urls";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const links = (await getCommunityLinks()).flatMap((link) => {
    const url = safeExternalUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link href={`/${locale}`} className="footer-brand">
            ICT <span>Community</span>
          </Link>
          <p>{t.footer}</p>
        </div>
        <div className="footer-links">
          <Link href={`/${locale}/about`}>{t.nav.about}</Link>
          <Link href={`/${locale}/contact`}>{t.nav.contact}</Link>
          {links.map((link) => (
            <a href={link.url} key={link.id} target="_blank" rel="noreferrer">
              {locale === "en" && link.titleEn ? link.titleEn : link.title}
            </a>
          ))}
        </div>
        <small>© {new Date().getFullYear()} ICT Community</small>
      </div>
    </footer>
  );
}
