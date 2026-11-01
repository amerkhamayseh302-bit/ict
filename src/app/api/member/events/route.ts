import { NextRequest, NextResponse } from "next/server";
import {
  createMemberSupabaseClient,
  memberNotConfigured,
  supabaseConfig,
} from "@/lib/member-auth";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readJsonBody } from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfig()) return memberNotConfigured();
  const supabase = await createMemberSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولاً." }, { status: 401 });

  const { data, error } = await supabase
    .from("event_subscriptions")
    .select("events_enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "تعذّر تحميل إعدادات التنبيهات. تأكد من تطبيق ملف قاعدة البيانات." },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { eventsEnabled: data?.events_enabled ?? false },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(request: NextRequest) {
  if (!supabaseConfig()) return memberNotConfigured();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "member-event-preferences", 30, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const supabase = await createMemberSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "سجّل الدخول أولاً." }, { status: 401 });
  const body = await readJsonBody(request, 2 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "إعداد التنبيه غير صالح.");
  if (!body.value || typeof body.value !== "object" || typeof (body.value as { eventsEnabled?: unknown }).eventsEnabled !== "boolean") {
    return badRequestResponse(400, "إعداد التنبيه غير صالح.");
  }
  const eventsEnabled = (body.value as { eventsEnabled: boolean }).eventsEnabled;
  const { error } = await supabase.from("event_subscriptions").upsert(
    {
      user_id: user.id,
      events_enabled: eventsEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return NextResponse.json(
      { error: "تعذّر حفظ اشتراك البريد. تأكد من تطبيق ملف قاعدة البيانات." },
      { status: 503 },
    );
  }
  return NextResponse.json({ eventsEnabled }, { headers: { "Cache-Control": "no-store" } });
}
