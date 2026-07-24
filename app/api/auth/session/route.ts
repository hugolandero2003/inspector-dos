import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

/**
 * Devuelve la sesión activa desde la cookie pesv_session.
 * El panel admin usa esto para obtener el token y enviarlo como Bearer.
 */
export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Devolver el JWT crudo desde la cookie para que el panel lo use como Bearer
  const rawToken = req.cookies.get("pesv_session")?.value ?? "";

  return NextResponse.json({
    authenticated: true,
    token:    rawToken,
    username: payload.nombre,
    rol:      payload.rol,
    empresaId: payload.empresaId,
    empresaNombre: payload.empresaNombre ?? null,
  });
}
