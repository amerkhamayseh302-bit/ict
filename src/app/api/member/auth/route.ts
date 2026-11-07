import { NextRequest, NextResponse } from "next/server";
import {
  getMemberUser,
  isMemberAuthConfigured,
  memberNotConfigured,
  signInMember,
  signOutMember,
  signUpMember,
} from "@/lib/member-auth";
import { z } from "zod";
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
  return NextResponse.json(
    {
      authenticated: Boolean(user),
      member: user ? { id: user.id, email: user.email } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isMemberAuthConfigured()) return memberNotConfigured();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  const limit = consumeRateLimit(request, "member-auth", 12, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);

  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok) return badRequestResponse(body.status, "طلب تسجيل الدخول غير صالح.");

  const parsed = z
    .object({
      action: z.enum(["signup", "login"]),
      email: z.string().trim().email().max(254),
      password: z.string().min(8).max(128),
      locale: z.enum(["ar", "en"]).default("ar"),
    })
    .safeParse(body.value);

  if (!parsed.success) {
    return badRequestResponse(400, "اكتب بريدًا صحيحًا وكلمة مرور من 8 إلى 128 حرفًا.");
  }

  const { action, email, password, locale } = parsed.data;

  try {
    if (action === "signup") {
      const { member } = await signUpMember({ email, password, locale });
      return NextResponse.json(
        {
          authenticated: true,
          member: { id: member.id, email: member.email },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const { member } = await signInMember({ email, password });
    return NextResponse.json(
      {
        authenticated: true,
        member: { id: member.id, email: member.email },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذّر تسجيل الدخول. تحقق من البيانات.";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isMemberAuthConfigured()) return memberNotConfigured();
  if (!isSameOriginMutation(request)) return badRequestResponse(403, "الطلب غير مسموح.");
  await signOutMember();
  return NextResponse.json(
    { authenticated: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
