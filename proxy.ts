import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Se elimina el prefijo "/app" ya que las carpetas ahora están en la raíz de app
const PROTECTED: Record<string, string[]> = {
  "/inspeccion": ["operador", "admin", "superadmin"],
  "/admin": ["admin", "superadmin"],
  "/superadmin": ["superadmin"],
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const matchedRoute = Object.keys(PROTECTED).find((route) =>
    pathname.startsWith(route)
  );

  if (!matchedRoute) return NextResponse.next();

 // const token = req.cookies.get("pesv_session")?.value;
 // const payload = token ? verifyToken(token) : null;
 const payload = { rol: "superadmin" };

  // Si no hay sesión, te manda al login guardando a qué ruta ibas
 /* if (!payload) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  } */

  const allowedRoles = PROTECTED[matchedRoute];
  if (!allowedRoles.includes(payload.rol)) {
    // Corrección de las rutas de redirección por rol
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
  // Escucha las rutas reales del sistema actualizadas
  matcher: ["/admin/:path*", "/inspeccion/:path*", "/superadmin/:path*"],
};
