import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function PUT(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const inspeccionId = req.nextUrl.pathname.split("/").pop();
  if (!inspeccionId) {
    return NextResponse.json({ error: "ID de inspección faltante." }, { status: 400 });
  }

  try {
    const body = (await req.json()) as {
      placa: string;
      interno?: string | null;
      tipo: string;
      marca: string;
      linea?: string | null;
      modelo?: string | null;
      kilometraje?: string | null;
      ruta?: string | null;
      conductor: string;
      licencia: string;
      inspector: string;
      fecha: string;
      concepto: string;
      observaciones?: string | null;
      checklist: Array<Record<string, unknown>>;
    };

    const inspeccion = await (prisma as any).inspeccion.findUnique({
      where: { id: inspeccionId },
      select: { empresaId: true, vehiculoId: true },
    });

    if (!inspeccion || inspeccion.empresaId !== payload.empresaId) {
      return NextResponse.json({ error: "Inspección no encontrada." }, { status: 404 });
    }

    const vehiculo = await (prisma as any).vehiculo.update({
      where: { id: inspeccion.vehiculoId },
      data: {
        placa: body.placa.trim().toUpperCase(),
        interno: body.interno?.trim() || null,
        tipo: body.tipo.trim(),
        marca: body.marca.trim(),
        linea: body.linea?.trim() || null,
        modelo: body.modelo?.trim() || null,
        kilometraje: body.kilometraje?.trim() || null,
        ruta: body.ruta?.trim() || null,
      },
    });

    await (prisma as any).inspeccion.update({
      where: { id: inspeccionId },
      data: {
        conductor: body.conductor.trim(),
        licencia: body.licencia.trim(),
        inspector: body.inspector.trim(),
        concepto: body.concepto.trim(),
        observaciones: body.observaciones?.trim() || null,
        fecha: body.fecha.trim(),
        checklist: body.checklist,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT inspecciones error:", error);
    return NextResponse.json({ error: "No fue posible actualizar la inspección." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const inspeccionId = req.nextUrl.pathname.split("/").pop();
  if (!inspeccionId) {
    return NextResponse.json({ error: "ID de inspección faltante." }, { status: 400 });
  }

  try {
    const inspeccion = await (prisma as any).inspeccion.findUnique({
      where: { id: inspeccionId },
      select: { empresaId: true },
    });

    if (!inspeccion || inspeccion.empresaId !== payload.empresaId) {
      return NextResponse.json({ error: "Inspección no encontrada." }, { status: 404 });
    }

    await (prisma as any).inspeccion.delete({ where: { id: inspeccionId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE inspecciones error:", error);
    return NextResponse.json({ error: "No fue posible eliminar la inspección." }, { status: 500 });
  }
}
