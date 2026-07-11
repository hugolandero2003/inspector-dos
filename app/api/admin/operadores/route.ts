import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, requireRole } from "@/lib/auth";
import bcrypt from "bcryptjs";

// ── GET: listar operadores ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!requireRole(payload, ["admin", "superadmin"])) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const usuarios = await (prisma as any).usuario.findMany({
    where: { empresaId: payload.empresaId, rol: "operador" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, nombre: true, email: true, rol: true,
      estado: true, createdAt: true,
    },
  });

  return NextResponse.json(usuarios);
}

// ── POST: crear operador ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!requireRole(payload, ["admin", "superadmin"])) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { nombre, email, password } = await req.json() as Record<string, string>;

  if (!nombre?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "Nombre, correo y contraseña son obligatorios." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const existe = await (prisma as any).usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existe) {
    return NextResponse.json({ error: "Ya existe un usuario con ese correo." }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);
  const usuario = await (prisma as any).usuario.create({
    data: {
      empresaId: payload.empresaId,
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password: hash,
      rol: "operador",
    },
    select: { id: true, nombre: true, email: true, estado: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}

// ── PATCH: activar/desactivar operador ───────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!requireRole(payload, ["admin", "superadmin"])) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id, estado } = await req.json() as { id: string; estado: boolean };

  const usuario = await (prisma as any).usuario.findFirst({
    where: { id, empresaId: payload.empresaId, rol: "operador" },
  });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const updated = await (prisma as any).usuario.update({
    where: { id },
    data: { estado },
    select: { id: true, nombre: true, estado: true },
  });

  return NextResponse.json(updated);
}
