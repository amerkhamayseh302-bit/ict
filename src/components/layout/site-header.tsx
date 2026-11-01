import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Globe2,
  Menu,
  UserRound,
  Wrench,
} from "lucide-react";
import type { Locale } from "@/features/catalog";
import { getDictionary } from "@/lib/i18n/dictionary";
import { IctLogo } from "./ict-logo";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const links = [
    ["courses", "courses", BookOpen],
    ["ai-tools", "tools", BrainCircuit],
    ["resources", "resources", Wrench],
    ["opportunities", "opportunities", BriefcaseBusiness],
    ["events", "events", CalendarDays],
  ] as const;
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={`/${locale}`} className="brand" aria-label={t.siteName}>
          <span className="brand-mark">
            <IctLogo size={44} priority />
          </span>
          <span>
            <strong>{t.siteName}</strong>
            <small>{t.tagline}</small>
          </span>
        </Link>
        <nav
          className="main-nav"
          aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}
        >
          {links.map(([path, key, Icon]) => (
            <Link key={path} href={`/${locale}/${path}`}>
              <Icon size={16} aria-hidden="true" />
              {t.nav[key]}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            className="language-link"
            href={`/${locale === "ar" ? "en" : "ar"}`}
          >
            <Globe2 size={16} />
            {t.language}
          </Link>
          <Link
            className="account-header-link"
            href={`/${locale}/account`}
            aria-label={locale === "ar" ? "حسابي" : "My account"}
          >
            <UserRound size={17} />
            {locale === "ar" ? "حسابي" : "Account"}
          </Link>
          <Link className="header-cta" href={`/${locale}/contact`}>
            {t.nav.contact}
            <ArrowUpRight size={15} />
          </Link>
          <span className="menu-icon" aria-hidden="true">
            <Menu />
          </span>
        </div>
      </div>
    </header>
  );
}
