import { ExternalLink, MessageSquareText } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/dictionary";
import { getCommunityLinks } from "@/lib/community-links";
import { safeExternalUrl } from "@/lib/urls";

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === "en";
  const links = (await getCommunityLinks()).flatMap((link) => {
    const url = safeExternalUrl(link.url);
    return url ? [{ ...link, url }] : [];
  });

  return (
    <main className="container page-main">
      <div className="page-heading">
        <span className="eyebrow">SAY HELLO</span>
        <h1>{en ? "Contact ICT Community" : "تواصل مع مجتمع ICT"}</h1>
        <p>
          {en
            ? "Join our communities to follow announcements, ask questions, and share useful resources."
            : "انضم لمجتمعاتنا لمتابعة الإعلانات وطرح الأسئلة ومشاركة المصادر المفيدة."}
        </p>
      </div>
      <section className="contact-card" aria-labelledby="community-heading">
        <div>
          <h2 id="community-heading">
            {en ? "Join our communities" : "انضم إلى مجموعاتنا"}
          </h2>
          <p>
            {en
              ? "Choose the channel that works best for you."
              : "اختَر القناة المناسبة إلك وانضم للمجتمع."}
          </p>
        </div>
        <div className="contact-community-list">
          {links.map((link) => (
            <a
              className="contact-community-link"
              href={link.url}
              key={link.id}
              target="_blank"
              rel="noreferrer"
            >
              <span className="contact-community-icon">
                <MessageSquareText size={19} />
              </span>
              <span className="contact-community-copy">
                <strong>{en && link.titleEn ? link.titleEn : link.title}</strong>
                <small>{link.platform === "other" ? (en ? "Community" : "مجتمع") : link.platform}</small>
              </span>
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          ))}
        </div>
        {!links.length && (
          <p role="status">
            {en ? "Community links will be available soon." : "روابط المجتمعات ستتوفر قريبًا."}
          </p>
        )}
        <small>
          {en
            ? "For a resource suggestion, include its original link and a short description."
            : "لاقتراح مورد، أرسل رابطه الأصلي ووصفًا قصيرًا عنه."}
        </small>
      </section>
    </main>
  );
}
