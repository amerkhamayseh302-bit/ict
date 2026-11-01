import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { isLocale } from "@/lib/i18n/dictionary";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "ICT Community | مجتمع ICT", template: "%s | ICT Community" },
  description: "مصادر تقنية وفرص تعلّم في مكان واحد.",
};

export function generateStaticParams() {
  return [{ locale: "ar" }, { locale: "en" }];
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}><body><SiteHeader locale={locale} />{children}<SiteFooter locale={locale} /></body></html>;
}
