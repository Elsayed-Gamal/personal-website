import { NextRequest, NextResponse } from "next/server";
import { adminProxy } from "@/lib/supabase/admin-proxy";

const locales = ["ar", "en"] as const;

function preferredLocale(request: NextRequest) {
  const savedLocale = request.cookies.get("site-locale")?.value;
  if (savedLocale === "ar" || savedLocale === "en") return savedLocale;

  return request.headers.get("accept-language")?.toLowerCase().includes("ar")
    ? "ar"
    : "en";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/"))
    return adminProxy(request);
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const locale = preferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = pathname.split("/")[1];
  const response = NextResponse.next();
  if (request.cookies.get("site-locale")?.value !== locale)
    response.cookies.set("site-locale", locale, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/((?!api|_next|.*\\..*).*)"],
};
