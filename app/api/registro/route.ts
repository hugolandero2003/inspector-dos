import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      empresa?: string;
      nit?: string;
      telefono?: string;
      nombre?: string;
      email?: string;
      password?: string;
    };

    const empresa   = body.empresa?.trim() ?? "";
    const nit       = body.nit?.trim() ?? "";
    const telefono  = body.telefono?.trim() ?? "";
    const nombre    = body.nombre?.trim() ?? "";
    const email     = body.email?.trim().toLowerCase() ?? "";
    const password  = body.password ?? "";

    // ── Validaciones ─────────────────────────────────────────────────────────
    if (!empresa || !nombre || !email || !password) {
      return NextResponse.json(
        { error: "Nombre de empresa, tu nombre, correo y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "El correo electrónico no es válido." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    // ── Verificar que el email no exista ya ───────────────────────────────────
    const existe = await (prisma as any).usuario.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existe) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo electrónico." },
        { status: 409 }
      );
    }

    // ── Crear empresa en plan demo (8 días) ───────────────────────────────────
    const planVence = new Date();
    planVence.setDate(planVence.getDate() + 8);

    const nuevaEmpresa = await (prisma as any).empresa.create({
      data: {
        nombre: empresa,
        nit:    nit || null,
        email,               // email corporativo = email del admin
        telefono: telefono || null,
        plan:     "demo",
        planVence,
        estado:   "activa",
      },
      select: { id: true, nombre: true },
    });

    // ── Crear usuario administrador ───────────────────────────────────────────
    const hash = await bcrypt.hash(password, 12);

    const nuevoUsuario = await (prisma as any).usuario.create({
      data: {
        empresaId: nuevaEmpresa.id,
        nombre,
        email,
        password: hash,
        rol: "admin",
      },
      select: { id: true },
    });

    // ── Auto-login: generar token y cookie ────────────────────────────────────
    const token = signToken({
      usuarioId: nuevoUsuario.id,
      empresaId: nuevaEmpresa.id,
      rol:       "admin",
      nombre,
    });

    const response = NextResponse.json(
      { ok: true, redirectTo: "/admin", token, username: nombre, empresaId: nuevaEmpresa.id },
      { status: 201 }
    );

    response.cookies.set("pesv_session", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 8,
      path:     "/",
    });

    return response;
  } catch (err) {
    console.error("POST /api/registro error:", err);
    return NextResponse.json(
      { error: "No fue posible crear la cuenta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
