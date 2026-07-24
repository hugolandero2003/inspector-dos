import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { Resend } from "resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOTIFY_EMAIL = process.env.REGISTRATION_NOTIFY_EMAIL ?? "muskhugo65@gmail.com";

async function sendRegistrationNotification(params: {
  empresa: string;
  nit: string;
  telefono: string;
  nombre: string;
  email: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !NOTIFY_EMAIL) return;

  const resend = new Resend(apiKey);
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 12px;">
      <h2 style="color: #0f62fe; margin-bottom: 8px;">📌 Nuevo registro de empresa</h2>
      <p style="color: #4b5563; margin-top: 0;">Se ha creado una nueva empresa desde el formulario de registro.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 18px; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <tr style="background: #0f62fe; color: white;"><td style="padding: 12px 16px; font-weight: 700;">Campo</td><td style="padding: 12px 16px; font-weight: 700;">Valor</td></tr>
        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">Empresa</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${params.empresa}</td></tr>
        <tr style="background: #f3f4f6;"><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">NIT / Documento</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${params.nit || "No especificado"}</td></tr>
        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">Teléfono</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${params.telefono}</td></tr>
        <tr style="background: #f3f4f6;"><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">Administrador</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">${params.nombre}</td></tr>
        <tr><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">Correo</td><td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${params.email}">${params.email}</a></td></tr>
      </table>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">Inspector PESV</p>
    </div>
  `;

  await resend.emails.send({
    from: "Inspector PESV <onboarding@resend.dev>",
    to: [NOTIFY_EMAIL],
    subject: `Nuevo registro de empresa — ${params.empresa}`,
    html: htmlContent,
  });
}

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
    if (!empresa || !nombre || !email || !telefono || !password) {
      return NextResponse.json(
        { error: "Nombre de empresa, teléfono, tu nombre, correo y contraseña son obligatorios." },
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
        email,
        telefono,
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
      { ok: true, redirectTo: "/admin", token, username: nombre, empresaId: nuevaEmpresa.id, empresaNombre: nuevaEmpresa.nombre },
      { status: 201 }
    );

    sendRegistrationNotification({ empresa, nit, telefono, nombre, email }).catch((err) => {
      console.error("Error sending registration notification:", err);
    });

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
