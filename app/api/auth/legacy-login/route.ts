import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

/**
 * Login unificado para /login.
 * Acepta { email, password, empresaId? }
 * Devuelve { token, username, redirectTo } compatible con AuthContext.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, empresaId } = await req.json() as {
      email?: string;
      password?: string;
      empresaId?: string;
      // compatibilidad legacy
      username?: string;
    };

    // Soporta campo "username" del formulario antiguo
    const emailOrUser = (email ?? (req as any)._body?.username ?? "").trim().toLowerCase();

    if (!emailOrUser || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    // Buscar por email exacto o email = input@halm.co (para usuario "admin")
    const candidates = [emailOrUser, `${emailOrUser}@halm.co`];

    const where: Record<string, unknown> = {
      OR: candidates.map((e) => ({ email: e })),
      estado: true,
    };

    // Si se especificó empresa, filtrar por ella (excepto superadmin que no tiene restricción)
    if (empresaId) {
      where.OR = candidates.map((e) => ({ email: e, empresaId }));
    }

    const usuario = await (prisma as any).usuario.findFirst({
      where,
      select: {
        id: true, nombre: true, email: true, password: true,
        rol: true, empresaId: true, estado: true,
        empresa: { select: { nombre: true, estado: true, plan: true, planVence: true } },
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciales incorrectas o usuario no encontrado." },
        { status: 401 }
      );
    }

    // Si tiene contraseña vacía (cuenta OAuth sin password), rechazar
    if (!usuario.password) {
      return NextResponse.json(
        { error: "Esta cuenta no tiene contraseña configurada." },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    // Verificar empresa activa (superadmin siempre pasa)
    if (usuario.rol !== "superadmin" && usuario.empresa?.estado !== "activa") {
      return NextResponse.json(
        { error: "Tu empresa está suspendida. Contacta a soporte." },
        { status: 403 }
      );
    }

    const token = signToken({
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      rol: usuario.rol as "superadmin" | "admin" | "operador",
      nombre: usuario.nombre,
      empresaNombre: usuario.empresa?.nombre ?? null,
    });

    // Ruta según rol
    const redirectTo =
      usuario.rol === "superadmin" ? "/superadmin" :
      usuario.rol === "admin"      ? "/admin" :
                                     "/inspeccion";

    // Cookie para el sistema nuevo
    const response = NextResponse.json({
      token,
      username: usuario.nombre,
      empresaId: usuario.empresaId,
      empresaNombre: usuario.empresa?.nombre ?? null,
      redirectTo,
    });

    response.cookies.set("pesv_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Legacy login error:", err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

