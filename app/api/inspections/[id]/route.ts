import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.inspection.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE inspection error:", err);
    return NextResponse.json({ error: "No encontrado o error al eliminar" }, { status: 404 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      placa,
      interno,
      tipo,
      marca,
      linea,
      modelo,
      kilometraje,
      ruta,
      conductor,
      licencia,
      inspector,
      fecha,
      hora,
      concepto,
      observaciones,
      checklist,
    } = body;

    await prisma.inspection.update({
      where: { id },
      data: {
        placa,
        interno,
        tipo,
        marca,
        linea,
        modelo,
        kilometraje,
        ruta,
        conductor,
        licencia,
        inspector,
        fecha,
        hora,
        concepto,
        observaciones,
        checklist: typeof checklist === "string" ? checklist : JSON.stringify(checklist),
        userId: payload.userId,
      },
    });

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      select: {
        id: true,
        placa: true,
        interno: true,
        tipo: true,
        marca: true,
        linea: true,
        modelo: true,
        kilometraje: true,
        ruta: true,
        conductor: true,
        licencia: true,
        inspector: true,
        fecha: true,
        hora: true,
        concepto: true,
        observaciones: true,
        checklist: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    });

    return NextResponse.json(inspection);
  } catch (err) {
    console.error("PUT inspection error:", err);
    return NextResponse.json({ error: "No fue posible actualizar la inspección" }, { status: 500 });
  }
}
