import "server-only";

import nodemailer from "nodemailer";
import type { ContentRecord } from "@/lib/local-content";

export function gmailConfig() {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  return user && pass ? { user, pass } : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const escaped: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return escaped[character] ?? character;
  });
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.toString() : "";
  } catch {
    return "";
  }
}

export function createEventMailer() {
  const config = gmailConfig();
  if (!config) return null;
  const transport = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 3,
    maxMessages: 20,
    auth: { user: config.user, pass: config.pass },
  });

  return {
    async verify() {
      await transport.verify();
    },
    async send(event: ContentRecord, recipient: string, siteUrl: string) {
      const baseUrl = siteUrl.replace(/\/+$/, "");
      const eventPageUrl = safeUrl(`${baseUrl}/ar/events/${encodeURIComponent(event.slug)}`);
      const sourceUrl = safeUrl(event.url);
      const accountUrl = safeUrl(`${baseUrl}/ar/account`);
      const title = escapeHtml(event.title);
      const summary = escapeHtml(event.summary);
      const titleEn = event.titleEn ? escapeHtml(event.titleEn) : "";
      const summaryEn = event.summaryEn ? escapeHtml(event.summaryEn) : "";
      const date = event.startAt && Number.isFinite(Date.parse(event.startAt))
        ? new Intl.DateTimeFormat("ar-PS", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Asia/Hebron",
          }).format(new Date(event.startAt))
        : "";
      const detailsUrl = eventPageUrl || sourceUrl;
      // [SECURITY FIX]: Strip control characters before passing user content to mail headers.
      const safeTitle = event.title.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
      const subject = `فعالية جديدة من مجتمع ICT: ${safeTitle}`.slice(0, 180);

      const text = [
        "مرحباً،",
        "أُضيفت فعالية جديدة إلى مجتمع ICT:",
        event.title,
        event.summary,
        date ? `موعد الفعالية: ${date}` : "",
        detailsUrl ? `التفاصيل: ${detailsUrl}` : "",
        sourceUrl && sourceUrl !== detailsUrl ? `رابط المصدر: ${sourceUrl}` : "",
        `لإيقاف رسائل الفعاليات، غيّر تفضيلك من حسابك: ${accountUrl}`,
      ].filter(Boolean).join("\n\n");

      const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f7f3fb;padding:28px 12px;font-family:Arial,Tahoma,sans-serif;color:#17213d"><main style="max-width:600px;margin:auto;background:#fff;border:1px solid #eadcf5;border-radius:20px;overflow:hidden"><div style="height:9px;background:linear-gradient(90deg,#7827d8,#d41491,#ff7950)"></div><div style="padding:30px"><div style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#9a25bc">ICT COMMUNITY</div><h1 style="font-size:25px;line-height:1.5;margin:14px 0;color:#17213d">فعالية جديدة من مجتمع ICT</h1><h2 style="font-size:20px;line-height:1.6;margin:0 0 6px">${title}</h2>${titleEn ? `<p style="margin:0 0 18px;color:#687187;direction:ltr;text-align:right">${titleEn}</p>` : ""}<p style="font-size:15px;line-height:1.9;color:#596579">${summary}</p>${summaryEn ? `<p style="font-size:14px;line-height:1.8;color:#687187;direction:ltr;text-align:left">${summaryEn}</p>` : ""}${date ? `<p style="padding:12px 14px;border-radius:12px;background:#f6edfb;color:#7627bd;font-weight:bold">موعد الفعالية: ${escapeHtml(date)}</p>` : ""}${detailsUrl ? `<p style="margin:25px 0"><a href="${escapeHtml(detailsUrl)}" style="display:inline-block;padding:13px 20px;border-radius:11px;color:#fff;background:linear-gradient(110deg,#7827d8,#d41491);font-weight:bold;text-decoration:none">تفاصيل الفعالية</a></p>` : ""}${sourceUrl && sourceUrl !== detailsUrl ? `<p><a href="${escapeHtml(sourceUrl)}" style="color:#8126ca">رابط التسجيل أو المصدر</a></p>` : ""}<hr style="border:0;border-top:1px solid #eee8f2;margin:26px 0 16px"><p style="font-size:12px;line-height:1.8;color:#758095">وصلتك هذه الرسالة لأنك فعّلت تنبيهات الفعاليات في حسابك.${accountUrl ? ` <a href="${escapeHtml(accountUrl)}" style="color:#8126ca">إيقاف التنبيهات</a>` : ""}</p></div></main></body></html>`;

      await transport.sendMail({
        from: { name: "ICT Community", address: config.user },
        to: recipient,
        subject,
        text,
        html,
      });
    },
    close() {
      transport.close();
    },
  };
}
