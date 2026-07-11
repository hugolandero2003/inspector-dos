import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

type LeadRequest = {
  nombre?: string;
  empresa?: string;
  cargo?: string;
  email?: string;
  telefono?: string;
  tamanoFlota?: string;
  interes?: "demo-8-dias" | "suscripcion" | "ambas";
  mensaje?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INTERES_LABELS: Record<string, string> = {
  "demo-8-dias": "Acceso de Prueba (8 días gratis)",
  "suscripcion": "Cotización de suscripción",
  "ambas": "Prueba gratis y cotización",
};

async function sendNotificationEmail(lead: LeadRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const interesLabel = INTERES_LABELS[lead.interes ?? "demo-8-dias"] ?? lead.interes;
  const now = new Date().toLocaleString("es-CO");

  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
        <h2 style="color: #0f62fe; margin-bottom: 4px;">📋 Nueva Solicitud de Acceso</h2>
        <p style="color: #666; margin-top: 0; margin-bottom: 24px;">Inspector PESV - ${now}</p>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
          <tr style="background: #0f62fe; color: white;">
            <td style="padding: 10px 16px; font-weight: bold; font-size: 13px;">Campo</td>
            <td style="padding: 10px 16px; font-weight: bold; font-size: 13px;">Valor</td>
          </tr>
          <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #555; font-size: 13px;">Nombre</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px;">${lead.nombre}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #555; font-size: 13px;">Empresa</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px;">${lead.empresa}</td></tr>
          <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #555; font-size: 13px;">Cargo</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px;">${lead.cargo || "-"}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #555; font-size: 13px;">Correo</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px;"><a href="mailto:${lead.email}">${lead.email}</a></td></tr>
          <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #555; font-size: 13px;">Telefono</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px;">${lead.telefono}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #555; font-size: 13px;">Tamaño de flota</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px;">${lead.tamanoFlota || "-"}</td></tr>
          <tr><td style="padding: 10px 16px; border-bottom: 1px solid #eee; color: #555; font-size: 13px;">Tipo de solicitud</td><td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px; font-weight: bold; color: #0f62fe;">${interesLabel}</td></tr>
          <tr style="background:#f9f9f9"><td style="padding: 10px 16px; color: #555; font-size: 13px;">Mensaje</td><td style="padding: 10px 16px; font-size: 13px;">${lead.mensaje || "-"}</td></tr>
        </table>
        <p style="color: #999; font-size: 12px; margin-top: 24px; text-align: center;">Inspector PESV · Desarrollado por HALM</p>
      </div>
    `;

  await resend.emails.send({
    from: "Inspector PESV <onboarding@resend.dev>",
    to: [process.env.LEAD_NOTIFY_EMAIL ?? ""],
    subject: `Nueva solicitud - ${lead.empresa}`,
    html: htmlContent,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LeadRequest;

    const nombre = body.nombre?.trim() ?? "";
    const empresa = body.empresa?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const telefono = body.telefono?.trim() ?? "";
    const tamanoFlota = body.tamanoFlota?.trim() ?? "";

    if (!nombre || !empresa || !email || !telefono) {
      return NextResponse.json(
        { error: "Nombre, empresa, correo y teléfono son obligatorios." },
        { status: 400 },
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Correo electrónico inválido." }, { status: 400 });
    }

    if (!tamanoFlota) {
      return NextResponse.json({ error: "El tamaño de flota es obligatorio." }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        nombre,
        empresa,
        cargo: body.cargo?.trim() || null,
        email,
        telefono,
        tamanoFlota: tamanoFlota || null,
        interes: body.interes ?? "demo-8-dias",
        mensaje: body.mensaje?.trim() || null,
      },
      select: { id: true },
    });

    sendNotificationEmail({ ...body, nombre, empresa, email, telefono, tamanoFlota })
      .catch((err) => console.error("Resend email error:", err));

    return NextResponse.json(
      { message: "Solicitud registrada. Nuestro equipo te contactará pronto.", id: lead.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST lead error:", error);
    return NextResponse.json({ error: "No fue posible registrar tu solicitud." }, { status: 500 });
  }
}
