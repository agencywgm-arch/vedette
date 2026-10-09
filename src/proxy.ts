import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/staff/auth";

/**
 * Gate for everything staff: the dashboard pages and its API. No valid
 * session cookie means no page (redirected to the login) and no data (401).
 * The route handlers re-check the session themselves; this is the front door,
 * not the only lock.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const open = pathname === "/staff/login" || pathname === "/api/staff/login";
  const ok = await isValidSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!ok && !open) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/staff/login", request.url));
  }
  if (ok && pathname === "/staff/login") {
    return NextResponse.redirect(new URL("/staff", request.url));
  }

  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/staff/:path*", "/api/staff/:path*"],
};
