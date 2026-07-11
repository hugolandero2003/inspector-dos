import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;

export type RolUsuario = "superadmin" | "admin" | "operador";

export type JWTPayload = {
  usuarioId: string;
  empresaId: string;
  rol: RolUsuario;
  nombre: string;
};

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): JWTPayload | null {
  // Soporta Bearer header y cookie de sesión
  const auth = req.headers.get("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    return verifyToken(auth.slice(7));
  }
  const cookie = req.cookies.get("pesv_session")?.value;
  if (cookie) return verifyToken(cookie);
  return null;
}

export function requireRole(
  payload: JWTPayload | null,
  roles: RolUsuario[]
): payload is JWTPayload {
  return payload !== null && roles.includes(payload.rol);
}
