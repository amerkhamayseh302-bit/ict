import { NextRequest, NextResponse } from "next/server";
import {
  createMemberSupabaseClient,
  memberNotConfigured,
  supabaseConfig,
} from "@/lib/member-auth";
import { z } from "zod";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readJsonBody } from "@/lib/request-security";
import { getSiteUrl } from "@/lib/urls";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfig()) return memberNotConfigured();
  const supabase = await createMemberSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  return NextResponse.json(
    {
      authenticated: Boolean(user),
      member: user ? { id: user.id, email: user.email } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!supabaseConfig()) return memberNotConfigured();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "member-auth", 12, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "طلب تسجيل الدخول غير صالح.");
  const parsed = z.object({
    action: z.enum(["signup", "login"]),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128),
    locale: z.enum(["ar", "en"]).default("ar"),
  }).safeParse(body.value);
  if (!parsed.success) return badRequestResponse(400, "اكتب بريدًا صحيحًا وكلمة مرور من 8 إلى 128 حرفًا.");
  const { action, locale } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  const signup = action === "signup";
  const supabase = await createMemberSupabaseClient();

  if (signup) {
    const callback = new URL("/api/auth/callback", getSiteUrl());
    callback.searchParams.set("locale", locale);
    callback.searchParams.set("next", `/${locale}/account?confirmed=1`);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callback.toString(),
        data: { preferred_locale: locale },
      },
    });
    if (error) {
      return NextResponse.json({ error: "تعذّر إنشاء الحساب. تحقق من البريد وحاول مرة أخرى." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (!data.session || !data.user) {
      return NextResponse.json({
        authenticated: false,
        confirmationRequired: true,
        message: "افتح رسالة التأكيد في بريدك، ثم ارجع وسجّل الدخول.",
      }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({
      authenticated: true,
      member: { id: data.user.id, email: data.user.email },
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.json(
      { error: "تعذّر تسجيل الدخول. تحقق من البيانات وتأكيد البريد الإلكتروني." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json({
    authenticated: true,
    member: { id: data.user.id, email: data.user.email },
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!supabaseConfig()) return memberNotConfigured();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const supabase = await createMemberSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
}
