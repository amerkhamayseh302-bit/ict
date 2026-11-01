import { NextRequest, NextResponse } from "next/server";
import { adminRequired, hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabaseClient } from "@/lib/admin-supabase";
import { createEventMailer, gmailConfig } from "@/lib/event-mailer";
import { readContent } from "@/lib/local-content";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readJsonBody } from "@/lib/request-security";
import { getSiteUrl } from "@/lib/urls";
import { z } from "zod";

export const runtime = "nodejs";

const PAGE_SIZE = 1000;
const SEND_BATCH_SIZE = 3;
const MAX_RECIPIENTS_PER_DISPATCH = 200;
const STALE_DISPATCH_MS = 15 * 60 * 1000;

type Recipient = { id: string; email: string };

async function getRecipients(supabase: NonNullable<ReturnType<typeof createAdminSupabaseClient>>) {
  const subscribedIds = new Set<string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("event_subscriptions")
      .select("user_id")
      .eq("events_enabled", true)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("تعذّر قراءة اشتراكات الفعاليات من Supabase.");
    for (const row of data ?? []) subscribedIds.add(row.user_id);
    if (!data || data.length < PAGE_SIZE) break;
  }
  if (subscribedIds.size === 0) return [];

  const recipients: Recipient[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw new Error("تعذّر جلب حسابات المشتركين من Supabase.");
    for (const user of data.users) {
      if (
        subscribedIds.has(user.id) &&
        user.email &&
        user.email_confirmed_at
      ) {
        recipients.push({ id: user.id, email: user.email });
      }
    }
    if (data.users.length < PAGE_SIZE || recipients.length === subscribedIds.size) break;
  }
  return recipients;
}

async function claimDispatch(
  supabase: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  eventId: string,
) {
  const now = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("event_email_dispatches")
    .insert({ event_id: eventId, status: "sending", sent_count: 0, failed_count: 0 });

  if (!insertError) return true;
  if (insertError.code !== "23505") {
    throw new Error("شغّل ملف docs/event-email-dispatch.sql في Supabase أولاً.");
  }

  const { data: existing, error } = await supabase
    .from("event_email_dispatches")
    .select("status, updated_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error || !existing) throw new Error("تعذّر قراءة سجل إرسال الفعالية.");
  if (existing.status === "sent") return false;

  let claim = supabase
    .from("event_email_dispatches")
    .update({ status: "sending", updated_at: now })
    .eq("event_id", eventId);
  if (existing.status === "failed") {
    claim = claim.eq("status", "failed");
  } else {
    const staleBefore = new Date(Date.now() - STALE_DISPATCH_MS).toISOString();
    claim = claim.eq("status", "sending").lt("updated_at", staleBefore);
  }
  const { data: claimed, error: claimError } = await claim
    .select("event_id")
    .maybeSingle();
  if (claimError) throw new Error("تعذّر بدء إرسال الفعالية.");
  return Boolean(claimed);
}

async function getDeliveredUserIds(
  supabase: NonNullable<ReturnType<typeof createAdminSupabaseClient>>,
  eventId: string,
) {
  const delivered = new Set<string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("event_email_deliveries")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("status", "sent")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("تعذّر قراءة سجل مستلمي الفعالية.");
    for (const row of data ?? []) delivered.add(row.user_id);
    if (!data || data.length < PAGE_SIZE) break;
  }
  return delivered;
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-event-email", 3, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const body = await readJsonBody(request, 4 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "بيانات الفعالية غير صالحة.");
  const parsed = z.object({ eventId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/) }).safeParse(body.value);
  if (!parsed.success) return badRequestResponse(400, "معرّف الفعالية غير صالح.");
  const eventId = parsed.data.eventId;

  const event = (await readContent()).find(
    (item) => item.id === eventId && item.type === "event",
  );
  if (!event) return NextResponse.json({ error: "الفعالية غير موجودة." }, { status: 404 });
  if (event.status !== "published") {
    return NextResponse.json({ error: "انشر الفعالية أولاً قبل إرسالها بالبريد." }, { status: 409 });
  }

  const supabase = createAdminSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "أضف SUPABASE_SECRET_KEY إلى .env.local حتى نتمكن من قراءة المشتركين بأمان." },
      { status: 503 },
    );
  }
  if (!gmailConfig()) {
    return NextResponse.json(
      { error: "أضف GMAIL_USER وGMAIL_APP_PASSWORD إلى .env.local لتفعيل الإرسال." },
      { status: 503 },
    );
  }

  let recipients: Recipient[];
  try {
    recipients = await getRecipients(supabase);
  } catch {
    return NextResponse.json(
      { error: "تعذّر تجهيز قائمة المستلمين." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (recipients.length === 0) {
    return NextResponse.json({ sentCount: 0, failedCount: 0, message: "لا يوجد أعضاء أكدوا بريدهم واشتركوا بتنبيهات الفعاليات." });
  }
  // [SECURITY FIX]: Bound synchronous email work; larger audiences need a durable queued worker.
  if (recipients.length > MAX_RECIPIENTS_PER_DISPATCH) {
    return NextResponse.json(
      { error: `عدد المشتركين يتجاوز الحد الحالي (${MAX_RECIPIENTS_PER_DISPATCH}). استخدم نظام إرسال مجدول قبل توسيع القائمة.` },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const claimed = await claimDispatch(supabase, eventId);
    if (!claimed) {
      return NextResponse.json(
        { error: "هذه الفعالية أُرسلت بالفعل أو يوجد إرسال جارٍ لها." },
        { status: 409 },
      );
    }

    const mailer = createEventMailer();
    if (!mailer) throw new Error("إعداد Gmail غير مكتمل.");
    let sentCount = 0;
    let failedCount = 0;
    try {
      await mailer.verify();
      const delivered = await getDeliveredUserIds(supabase, eventId);
      const pending = recipients.filter((recipient) => !delivered.has(recipient.id));
      const siteUrl = getSiteUrl();

      for (let offset = 0; offset < pending.length; offset += SEND_BATCH_SIZE) {
        const batch = pending.slice(offset, offset + SEND_BATCH_SIZE);
        const outcomes = await Promise.all(batch.map(async (recipient) => {
          const key = { event_id: eventId, user_id: recipient.id };
          try {
            const { error: logError } = await supabase
              .from("event_email_deliveries")
              .upsert(
                { ...key, status: "sending", updated_at: new Date().toISOString() },
                { onConflict: "event_id,user_id" },
              );
            if (logError) return false;

            await mailer.send(event, recipient.email, siteUrl);
            const { error: sentLogError } = await supabase
              .from("event_email_deliveries")
              .upsert(
                { ...key, status: "sent", updated_at: new Date().toISOString() },
                { onConflict: "event_id,user_id" },
              );
            if (sentLogError) return false;
            return true;
          } catch {
            await supabase
              .from("event_email_deliveries")
              .upsert(
                { ...key, status: "failed", updated_at: new Date().toISOString() },
                { onConflict: "event_id,user_id" },
              );
            return false;
          }
        }));
        sentCount += outcomes.filter(Boolean).length;
        failedCount += outcomes.filter((sent) => !sent).length;
      }

      const { error: updateError } = await supabase
        .from("event_email_dispatches")
        .update({
          status: failedCount ? "failed" : "sent",
          sent_count: delivered.size + sentCount,
          failed_count: failedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);
      if (updateError) throw new Error("تعذّر تحديث حالة إرسال الفعالية.");

      return NextResponse.json({ sentCount, failedCount }, { headers: { "Cache-Control": "no-store" } });
    } finally {
      mailer.close();
    }
  } catch {
    await supabase
      .from("event_email_dispatches")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .eq("status", "sending");
    return NextResponse.json(
      { error: "تعذّر إرسال الفعالية. تحقق من إعداد البريد وقاعدة البيانات ثم حاول لاحقًا." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
