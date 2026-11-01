import { NextRequest, NextResponse } from "next/server";

const locales = ["ar", "en"] as const;
const defaultLocale = "ar";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Keep the separate admin dashboard outside the public locale routes.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.next();
  }

  // Keep older/localized admin links working while moving them to the dashboard route.
  const localizedAdmin = pathname.match(/^\/(ar|en)\/admin(?:\/.*)?$/);
  if (localizedAdmin) {
    const adminPath = pathname.replace(/^\/(ar|en)\/admin/, "/admin");
    return NextResponse.redirect(new URL(adminPath, request.url));
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) return NextResponse.next();

  const locale = request.headers
    .get("accept-language")
    ?.toLowerCase()
    .startsWith("en")
    ? "en"
    : defaultLocale;

  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
}

export const config = {
  // Leave public files (logos, uploaded media, generated illustrations, etc.)
  // outside locale redirects so their original URLs keep working.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
