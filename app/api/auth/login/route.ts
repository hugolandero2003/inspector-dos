import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        empresa: {
          select: { id: true, nombre: true, estado: true, plan: true, planVence: true },
        },
      },
    });

    if (!usuario || !usuario.estado) {
      return NextResponse.json(
        { error: "Credenciales incorrectas o cuenta inactiva." },
        { status: 401 }
      );
    }

    const passwordOk = await bcrypt.compare(password, usuario.password);
    if (!passwordOk) {
      return NextResponse.json(
        { error: "Credenciales incorrectas o cuenta inactiva." },
        { status: 401 }
      );
    }

    // Verificar empresa activa (superadmin siempre puede pasar)
    if (usuario.rol !== "superadmin") {
      if (usuario.empresa.estado !== "activa") {
        return NextResponse.json(
          { error: "Tu empresa está suspendida. Contacta a soporte." },
          { status: 403 }
        );
      }
      if (
        usuario.empresa.plan === "demo" &&
        usuario.empresa.planVence &&
        new Date() > new Date(usuario.empresa.planVence)
      ) {
        return NextResponse.json(
          { error: "Tu período de prueba ha vencido. Contacta a soporte para activar tu plan." },
          { status: 403 }
        );
      }
    }

    const token = signToken({
      usuarioId: usuario.id,
      empresaId: usuario.empresaId,
      rol: usuario.rol as "superadmin" | "admin" | "operador",
      nombre: usuario.nombre,
    });

    const redirectTo =
      usuario.rol === "superadmin"
        ? "/superadmin"
        : usuario.rol === "admin"
        ? "/app/admin"
        : "/app/inspeccion";

    const response = NextResponse.json({
      ok: true,
      redirectTo,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        empresa: usuario.empresa.nombre,
      },
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
    console.error("Login error:", err);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("pesv_session");
  return response;
}

