import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const isPublic =
    nextUrl.pathname.startsWith("/survey/") ||
    nextUrl.pathname === "/login" ||
    nextUrl.pathname.startsWith("/api/auth");

  // Check for session cookie (next-auth sets authjs.session-token or next-auth.session-token)
  const sessionToken =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-authjs.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");

  const isLoggedIn = !!sessionToken;

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
