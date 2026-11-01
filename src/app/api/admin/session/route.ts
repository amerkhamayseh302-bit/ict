import { NextRequest, NextResponse } from "next/server";
import { clearAdminSession, hasAdminSession, isAdminConfigured, passwordMatches, setAdminSession } from "@/lib/admin-auth";
import { badRequestResponse, consumeRateLimit, isSameOriginMutation, rateLimitResponse, readJsonBody } from "@/lib/request-security";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({ configured: isAdminConfigured(), authenticated: hasAdminSession(request) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "admin-login", 5, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (!isAdminConfigured()) return NextResponse.json({ error: "اضبط كلمة مرور الإدارة وسر الجلسة في ملف .env.local أولاً." }, { status: 503 });
  const body = await readJsonBody(request, 4 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "طلب تسجيل الدخول غير صالح.");
  const parsed = z.object({ password: z.string().min(1).max(256) }).safeParse(body.value);
  if (!parsed.success || !passwordMatches(parsed.data.password)) return NextResponse.json({ error: "كلمة المرور غير صحيحة." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  setAdminSession(response);
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  clearAdminSession(response);
  return response;
}
