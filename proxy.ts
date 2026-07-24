import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";

const PROTECTED: Record<string, string[]> = {
  "/inspeccion": ["operador", "admin", "superadmin"],
  "/admin": ["admin", "superadmin"],
  "/superadmin": ["superadmin"],
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const matchedRoute = Object.keys(PROTECTED).find((route) => pathname.startsWith(route));
  if (!matchedRoute) return NextResponse.next();

  const payload = getTokenFromRequest(req);
  if (!payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = PROTECTED[matchedRoute];
  if (!allowedRoles.includes(payload.rol)) {
    const home =
      payload.rol === "superadmin"
        ? "/superadmin"
        : payload.rol === "admin"
        ? "/admin"
        : "/inspeccion";
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/inspeccion/:path*", "/superadmin/:path*"],
};
