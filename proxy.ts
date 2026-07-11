import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PROTECTED: Record<string, string[]> = {
  "/app/inspeccion": ["operador", "admin", "superadmin"],
  "/app/admin": ["admin", "superadmin"],
  "/superadmin": ["superadmin"],
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matchedRoute = Object.keys(PROTECTED).find((route) =>
    pathname.startsWith(route)
  );

  if (!matchedRoute) return NextResponse.next();

  const token = req.cookies.get("pesv_session")?.value;
  const payload = token ? verifyToken(token) : null;

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
        ? "/app/admin"
        : "/app/inspeccion";
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/superadmin/:path*"],
};
