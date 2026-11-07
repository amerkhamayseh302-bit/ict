import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  getMemberUser,
  isMemberAuthConfigured,
  memberNotConfigured,
} from "@/lib/member-auth";
import {
  badRequestResponse,
  consumeRateLimit,
  isSameOriginMutation,
  rateLimitResponse,
  readJsonBody,
} from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  if (!isMemberAuthConfigured()) return memberNotConfigured();
  const user = await getMemberUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولاً." }, { status: 401 });

  try {
    const result = await query<{ events_enabled: boolean }>(
      `SELECT events_enabled FROM event_subscriptions WHERE user_id = $1`,
      [user.id],
    );
    const eventsEnabled = result.rows[0]?.events_enabled ?? false;
    return NextResponse.json(
      { eventsEnabled },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to fetch event subscription:", error);
    return NextResponse.json(
      { error: "تعذّر تحميل إعدادات التنبيهات. تأكد من تطبيق ملف قاعدة البيانات." },
      { status: 503 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isMemberAuthConfigured()) return memberNotConfigured();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "member-event-preferences", 30, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const user = await getMemberUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولاً." }, { status: 401 });

  const body = await readJsonBody(request, 2 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "إعداد التنبيه غير صالح.");
  if (
    !body.value ||
    typeof body.value !== "object" ||
    typeof (body.value as { eventsEnabled?: unknown }).eventsEnabled !== "boolean"
  ) {
    return badRequestResponse(400, "إعداد التنبيه غير صالح.");
  }

  const eventsEnabled = (body.value as { eventsEnabled: boolean }).eventsEnabled;

  try {
    await query(
      `INSERT INTO event_subscriptions (user_id, events_enabled, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET events_enabled = EXCLUDED.events_enabled,
           updated_at = EXCLUDED.updated_at`,
      [user.id, eventsEnabled],
    );

    return NextResponse.json(
      { eventsEnabled },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to update event subscription:", error);
    return NextResponse.json(
      { error: "تعذّر حفظ اشتراك البريد. تأكد من تطبيق ملف قاعدة البيانات." },
      { status: 503 },
    );
  }
}
