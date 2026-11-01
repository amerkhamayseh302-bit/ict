import { NextRequest, NextResponse } from "next/server";
import { type Locale } from "@/features/catalog";
import { getPublicItems } from "@/lib/public-content";
import { badRequestResponse, consumeRateLimit, rateLimitResponse } from "@/lib/request-security";

export async function GET(request: NextRequest) {
  const limit = consumeRateLimit(request, "public-search", 90, 60 * 1000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.length > 120) return badRequestResponse(400, "عبارة البحث طويلة جدًا.");
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale: Locale = requestedLocale === "en" ? "en" : "ar";
  const matches = await getPublicItems(undefined, locale, query);
  const items = matches.slice(0, 100).map(({ slug, type, title, titleEn, summary, summaryEn, category, categoryEn, url }) => ({ slug, type, title, titleEn, summary, summaryEn, category, categoryEn, url }));
  return NextResponse.json({ query, count: items.length, items }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
