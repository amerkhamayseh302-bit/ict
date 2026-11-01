import Link from "next/link";
import Image from "next/image";
import { IctLogo } from "@/components/layout/ict-logo";
import {
  ArrowUpLeft,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Search,
  Wrench,
} from "lucide-react";
import type { Locale } from "@/features/catalog";
import { typeInfo } from "@/features/catalog";
import { CatalogCard } from "@/components/cards/catalog-card";
import { SectionCard } from "@/components/cards/section-card";
import { getDictionary, isLocale } from "@/lib/i18n/dictionary";
import { notFound } from "next/navigation";
import { getPublicItems } from "@/lib/public-content";

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const t = getDictionary(locale);
  const Arrow = locale === "ar" ? ArrowUpLeft : ArrowUpRight;
  const sections = [
    { type: "course", Icon: BookOpen },
    { type: "ai-tool", Icon: BrainCircuit },
    { type: "resource", Icon: Wrench },
    { type: "opportunity", Icon: BriefcaseBusiness },
    { type: "event", Icon: CalendarDays },
  ] as const;
  const allItems = await getPublicItems(undefined, locale);
  const featured = allItems.slice(0, 3);
  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow hero-reveal hero-reveal-one">LEARN · BUILD · SHARE</span>
            <h1 className="hero-reveal hero-reveal-two">
              {locale === "ar" ? (
                <>
                  خلّي خطوتك
                  <br />
                  <span>التقنية أوضح.</span>
                </>
              ) : (
                <>
                  Make your next
                  <br />
                  <span>tech step clearer.</span>
                </>
              )}
            </h1>
            <p className="hero-reveal hero-reveal-three">
              {locale === "ar"
                ? "دورات وأدوات وموارد وفرص مختارة، يجمعها مجتمع ICT لتسهّل عليك بداية الطريق."
                : "Courses, tools, resources, and opportunities gathered by the ICT Community to help you find your next step."}
            </p>
            <div className="hero-actions hero-reveal hero-reveal-four">
              <Link
                className="button button-primary"
                href={`/${locale}/courses`}
              >
                {locale === "ar" ? "اكتشف الدورات" : "Explore courses"}
                <Arrow size={17} />
              </Link>
              <Link className="button button-light" href={`/${locale}/about`}>
                {t.nav.about}
              </Link>
            </div>
          </div>
          <div className="hero-art" aria-label="مجتمع ICT للتعلّم والتقنية">
            <div className="hero-visual">
              <Image
                className="hero-visual-image"
                src="/ict-community-hero.png"
                alt={locale === "ar" ? "مشهد تقني يرمز للتعلم والبرمجة والذكاء الاصطناعي" : "Technology illustration representing learning, coding, and AI"}
                width={1648}
                height={1024}
                priority
              />
              <div className="hero-identity">
                <IctLogo size={56} alt="شعار مجتمع ICT" priority />
                <span>
                  <strong>ICT Community</strong>
                  <small>{locale === "ar" ? "نتعلّم · نبني · نشارك" : "Learn · Build · Share"}</small>
                </span>
              </div>
            </div>
            <div className="float-chip chip-one">01 / LEARN</div>
            <div className="float-chip chip-two">02 / BUILD</div>
            <div className="float-chip chip-three">03 / SHARE</div>
          </div>
        </div>
        <div className="container hero-search-wrap">
          <form action={`/${locale}/search`} className="hero-search">
            <Search size={21} />
            <input name="q" placeholder={t.search} aria-label={t.search} />
            <button className="button button-dark" type="submit">
              {t.searchButton}
              <Arrow size={16} />
            </button>
          </form>
        </div>
      </section>
      <section className="container section-block">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPLORE</span>
            <h2>
              {locale === "ar"
                ? "كل اللي تحتاجه بمكان واحد"
                : "Everything you need, in one place"}
            </h2>
          </div>
        </div>
        <div className="section-grid">
          {sections.map(({ type, Icon }) => {
            const info = typeInfo[type];
            return (
              <SectionCard
                key={type}
                href={`/${locale}/${info.path}`}
                title={locale === "ar" ? info.title : info.titleEn}
                description={
                  locale === "ar" ? info.description : info.descriptionEn
                }
                count={`${allItems
                  .filter((item) => item.type === type)
                  .length.toString()
                  .padStart(2, "0")} ${locale === "ar" ? "مصادر" : "items"}`}
                Icon={Icon}
                locale={locale}
              />
            );
          })}
        </div>
      </section>
      <section className="featured-section">
        <div className="container section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.featured}</span>
              <h2>{locale === "ar" ? "ابدأ من هون" : "Start here"}</h2>
            </div>
            <Link className="text-link" href={`/${locale}/search`}>
              {t.browse}
              <Arrow size={17} />
            </Link>
          </div>
          <div className="catalog-grid">
            {featured.map((item) => (
              <CatalogCard key={item.slug} item={item} locale={locale} />
            ))}
          </div>
        </div>
      </section>
      <section className="community-cta container">
        <div>
          <span className="eyebrow">ICT COMMUNITY</span>
          <h2>
            {locale === "ar"
              ? "عندك مصدر مفيد؟ شاركه معنا."
              : "Found something useful? Share it with us."}
          </h2>
          <p>
            {locale === "ar"
              ? "نراجع الاقتراحات ونضيف المصادر المفيدة للمجتمع."
              : "We review suggestions and add helpful resources for the community."}
          </p>
        </div>
        <Link className="button button-primary" href={`/${locale}/contact`}>
          {t.nav.contact}
          <Arrow size={17} />
        </Link>
      </section>
    </main>
  );
}
