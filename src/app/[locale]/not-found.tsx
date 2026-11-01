import Link from "next/link";

export default async function NotFound({ params }: { params: Promise<{ locale?: string }> }) {
  const { locale = "ar" } = await params;
  const english = locale === "en";
  return <main className="container page-main not-found"><span className="eyebrow">404 · ICT COMMUNITY</span><h1>{english ? "We couldn't find that page." : "ما لقينا الصفحة."}</h1><p>{english ? "The link may have changed, or the page may have been removed." : "يمكن الرابط تغيّر أو الصفحة انحذفت."}</p><Link className="button button-primary" href={`/${english ? "en" : "ar"}`}>{english ? "Back to home" : "العودة للرئيسية"}</Link></main>;
}
