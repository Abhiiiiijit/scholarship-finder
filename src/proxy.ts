import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { auth } from "@/server/auth/auth";
import { isAdmin } from "@/server/auth/allowlist";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/i18n/locales";
import { routing } from "@/i18n/routing";

// First gate for /admin: a plain redirect before anything renders. Layouts render in parallel
// with their pages, so every admin page and server action still calls requireAdmin() itself.
const admin = auth((req) => {
  if (!isAdmin(req.auth?.user?.login)) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }
});

// Student pages: /results is English, /hi/results Hindi (next-intl serves both from app/[locale]).
const intl = createMiddleware(routing);

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return admin(req, event as never);

  // A student who picked a language on this phone opens in it next time. Only English URLs are
  // redirected, so a shared /hi link always opens in Hindi.
  const chosen = req.cookies.get(LOCALE_COOKIE)?.value;
  const prefixed = routing.locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!prefixed && chosen !== DEFAULT_LOCALE && isLocale(chosen)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${chosen}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }
  return intl(req);
}

// Everything but the API, Next's own files and files with an extension (icons, the manifest).
export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
