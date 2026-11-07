import { NextRequest, NextResponse } from "next/server";
import { adminRequired, hasAdminSession } from "@/lib/admin-auth";
import { query, isDbConfigured } from "@/lib/db";
import { ensureSchema } from "@/lib/db-init";
import { createEventMailer, gmailConfig } from "@/lib/event-mailer";
import { readContent } from "@/lib/local-content";
import {
  badRequestResponse,
  consumeRateLimit,
  isSameOriginMutation,
  rateLimitResponse,
  readJsonBody,
} from "@/lib/request-security";
import { getSiteUrl } from "@/lib/urls";
import { z } from "zod";

export const runtime = "nodejs";

const SEND_BATCH_SIZE = 3;
const MAX_RECIPIENTS_PER_DISPATCH = 200;
const STALE_DISPATCH_MS = 15 * 60 * 1000;

type Recipient = { id: string; email: string };

async function getRecipients(): Promise<Recipient[]> {
  const result = await query<{ id: string; email: string }>(
    `SELECT m.id, m.email
     FROM members m
     JOIN event_subscriptions s ON s.user_id = m.id
     WHERE s.events_enabled = true AND m.email_confirmed_at IS NOT NULL`,
  );
  return result.rows;
}

async function claimDispatch(eventId: string): Promise<boolean> {
  const now = new Date().toISOString();

  // Try to insert new dispatch record
  const insertResult = await query(
    `INSERT INTO event_email_dispatches (event_id, status, sent_count, failed_count, created_at, updated_at)
     VALUES ($1, 'sending', 0, 0, $2, $2)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [eventId, now],
  );

  if (insertResult.rowCount && insertResult.rowCount > 0) {
    return true;
  }

  // If already exists, check status
  const existingResult = await query<{ status: string; updated_at: Date }>(
    `SELECT status, updated_at FROM event_email_dispatches WHERE event_id = $1`,
    [eventId],
  );

  const existing = existingResult.rows[0];
  if (!existing || existing.status === "sent") return false;

  const staleBefore = new Date(Date.now() - STALE_DISPATCH_MS);

  // Claim if failed or stale
  const claimResult = await query(
    `UPDATE event_email_dispatches
     SET status = 'sending', updated_at = $1
     WHERE event_id = $2 AND (status = 'failed' OR (status = 'sending' AND updated_at < $3))
     RETURNING event_id`,
    [now, eventId, staleBefore.toISOString()],
  );

  return Boolean(claimResult.rowCount && claimResult.rowCount > 0);
}

async function getDeliveredUserIds(eventId: string): Promise<Set<string>> {
  const result = await query<{ user_id: string }>(
    `SELECT user_id FROM event_email_deliveries WHERE event_id = $1 AND status = 'sent'`,
    [eventId],
  );
  return new Set(result.rows.map((row) => row.user_id));
}

async function recordDelivery(
  eventId: string,
  userId: string,
  status: "sending" | "sent" | "failed",
): Promise<void> {
  await query(
    `INSERT INTO event_email_deliveries (event_id, user_id, status, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (event_id, user_id) DO UPDATE
     SET status = EXCLUDED.status,
         updated_at = EXCLUDED.updated_at`,
    [eventId, userId, status],
  );
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) return adminRequired();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-event-email", 3, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const body = await readJsonBody(request, 4 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "بيانات الفعالية غير صالحة.");
  const parsed = z
    .object({
      eventId: z
        .string()
        .trim()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
    })
    .safeParse(body.value);
  if (!parsed.success) return badRequestResponse(400, "معرّف الفعالية غير صالح.");
  const eventId = parsed.data.eventId;

  const event = (await readContent()).find(
    (item) => item.id === eventId && item.type === "event",
  );
  if (!event) return NextResponse.json({ error: "الفعالية غير موجودة." }, { status: 404 });
  if (event.status !== "published") {
    return NextResponse.json({ error: "انشر الفعالية أولاً قبل إرسالها بالبريد." }, { status: 409 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "أضف DATABASE_URL إلى .env.local حتى نتمكن من قراءة المشتركين بأمان." },
      { status: 503 },
    );
  }
  if (!gmailConfig()) {
    return NextResponse.json(
      { error: "أضف GMAIL_USER وGMAIL_APP_PASSWORD إلى .env.local لتفعيل الإرسال." },
      { status: 503 },
    );
  }

  await ensureSchema();

  let recipients: Recipient[];
  try {
    recipients = await getRecipients();
  } catch {
    return NextResponse.json(
      { error: "تعذّر تجهيز قائمة المستلمين من قاعدة البيانات." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (recipients.length === 0) {
    return NextResponse.json({
      sentCount: 0,
      failedCount: 0,
      message: "لا يوجد أعضاء أكدوا بريدهم واشتركوا بتنبيهات الفعاليات.",
    });
  }

  if (recipients.length > MAX_RECIPIENTS_PER_DISPATCH) {
    return NextResponse.json(
      {
        error: `عدد المشتركين يتجاوز الحد الحالي (${MAX_RECIPIENTS_PER_DISPATCH}). استخدم نظام إرسال مجدول قبل توسيع القائمة.`,
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const claimed = await claimDispatch(eventId);
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
      const delivered = await getDeliveredUserIds(eventId);
      const pending = recipients.filter((recipient) => !delivered.has(recipient.id));
      const siteUrl = getSiteUrl();

      for (let offset = 0; offset < pending.length; offset += SEND_BATCH_SIZE) {
        const batch = pending.slice(offset, offset + SEND_BATCH_SIZE);
        const outcomes = await Promise.all(
          batch.map(async (recipient) => {
            try {
              await recordDelivery(eventId, recipient.id, "sending");
              await mailer.send(event, recipient.email, siteUrl);
              await recordDelivery(eventId, recipient.id, "sent");
              return true;
            } catch {
              await recordDelivery(eventId, recipient.id, "failed");
              return false;
            }
          }),
        );
        sentCount += outcomes.filter(Boolean).length;
        failedCount += outcomes.filter((sent) => !sent).length;
      }

      await query(
        `UPDATE event_email_dispatches
         SET status = $1, sent_count = $2, failed_count = $3, updated_at = NOW()
         WHERE event_id = $4`,
        [
          failedCount ? "failed" : "sent",
          delivered.size + sentCount,
          failedCount,
          eventId,
        ],
      );

      return NextResponse.json(
        { sentCount, failedCount },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      mailer.close();
    }
  } catch {
    await query(
      `UPDATE event_email_dispatches
       SET status = 'failed', updated_at = NOW()
       WHERE event_id = $1 AND status = 'sending'`,
      [eventId],
    );
    return NextResponse.json(
      { error: "تعذّر إرسال الفعالية. تحقق من إعداد البريد وقاعدة البيانات ثم حاول لاحقًا." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
