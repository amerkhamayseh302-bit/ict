import { NextRequest, NextResponse } from "next/server";
import { createMemberSupabaseClient, supabaseConfig } from "@/lib/member-auth";
import { getSiteUrl } from "@/lib/urls";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const siteUrl = getSiteUrl();
  const fallback = `/${locale}/account?auth_error=confirmation`;
  const next = request.nextUrl.searchParams.get("next");
  const safeNext =
    next?.startsWith(`/${locale}/`) && !next.startsWith("//") && !next.includes("\\")
      ? next
      : `/${locale}/account?confirmed=1`;
  const code = request.nextUrl.searchParams.get("code");

  if (!code || !supabaseConfig()) {
    return NextResponse.redirect(new URL(fallback, siteUrl), { headers: { "Cache-Control": "no-store" } });
  }

  const supabase = await createMemberSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? fallback : safeNext, siteUrl), { headers: { "Cache-Control": "no-store" } });
}
