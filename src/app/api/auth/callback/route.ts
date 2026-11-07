import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isMemberAuthConfigured } from "@/lib/member-auth";
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

  const token = request.nextUrl.searchParams.get("token");

  if (!token || !isMemberAuthConfigured()) {
    return NextResponse.redirect(new URL(fallback, siteUrl), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const result = await query(
      `UPDATE members
       SET email_confirmed_at = NOW(), confirmation_token = NULL
       WHERE confirmation_token = $1 AND email_confirmed_at IS NULL
       RETURNING id`,
      [token],
    );

    if (result.rowCount === 0) {
      return NextResponse.redirect(new URL(fallback, siteUrl), {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.redirect(new URL(safeNext, siteUrl), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.redirect(new URL(fallback, siteUrl), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
