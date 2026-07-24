import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

// ──────────────────────────────────────────────────────────────
// GET: Obtener el historial filtrado por empresa logueada
// ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const inspecciones = await (prisma as any).inspeccion.findMany({
      where: {
        empresaId: payload.empresaId,
      },
      include: {
        vehiculo: {
          select: {
            placa: true,
            interno: true,
            tipo: true,
            marca: true,
            linea: true,
            modelo: true,
          },
        },
      },
      orderBy: { 
        fecha: "desc" 
      },
    });

    return NextResponse.json(inspecciones);
  } catch (error) {
    console.error("GET inspecciones error:", error);
    return NextResponse.json({ error: "No fue posible obtener las inspecciones." }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// POST: Guardar inspección (Auto-registro de Vehículo / Upsert)
// ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      empresaId?: string;
      placa?: string;
      vehiculoId?: string;
      interno?: string;
      tipo?: string;
      marca?: string;
      linea?: string;
      modelo?: string;
      color?: string;
      conductor?: string;
      licencia?: string;
      ruta?: string;
      kilometraje?: string;
      checklist?: Array<{ id: string; item: string; categoria: string; estado: "ok" | "falla" | "na"; obs: string }>;
    };

    const {
      empresaId: empresaIdFromBody,
      placa,
      vehiculoId,
      interno,
      tipo,
      marca,
      linea,
      modelo,
      color,
      conductor,
      licencia,
      ruta,
      kilometraje,
      checklist,
    } = body;

    const empresaId = payload?.empresaId ?? empresaIdFromBody ?? req.nextUrl.searchParams.get("empresaId") ?? null;

    if (!empresaId) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const empresaExiste = await (prisma as any).empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });

    if (!empresaExiste) {
      return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
    }

    // Tomamos la placa del campo directo o del vehiculoId
    const placaLimpia = (placa || vehiculoId)?.trim().toUpperCase();

    if (!placaLimpia || !conductor || !licencia || !checklist?.length) {
      return NextResponse.json(
        { error: "Placa, conductor, licencia y checklist son obligatorios." },
        { status: 400 }
      );
    }

    const datosVehiculo = {
      interno: interno?.trim() || null,
      tipo: tipo?.trim() || "Otros",
      marca: marca?.trim() || "Sin especificar",
      linea: linea?.trim() || null,
      modelo: modelo?.trim() || null,
      color: color?.trim() || null,
      estado: true,
    };

    const usuarioParaInspeccion = payload?.usuarioId
      ? await (prisma as any).usuario.findFirst({
          where: { id: payload.usuarioId, empresaId, estado: true },
          select: { id: true },
        })
      : null;

    const usuarioId = usuarioParaInspeccion?.id ?? (await (prisma as any).usuario.findFirst({
      where: { empresaId, estado: true, rol: { in: ["admin", "superadmin"] } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }))?.id ?? (await (prisma as any).usuario.findFirst({
      where: { empresaId, estado: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }))?.id;

    if (!usuarioId) {
      return NextResponse.json({ error: "No existe un usuario activo para esta empresa." }, { status: 404 });
    }

    // Auto-registro / Actualización en caliente aislada por empresa
    const vehiculo = await (prisma as any).vehiculo.upsert({
      where: {
        empresaId_placa: {
          empresaId,
          placa: placaLimpia,
        },
      },
      update: datosVehiculo,
      create: {
        ...datosVehiculo,
        placa: placaLimpia,
        empresaId,
      },
    });

    // Determinar resultado según checklist
    const hasFalla = checklist.some((i) => i.estado === "falla");
    const concepto = hasFalla ? "rechazado" : "aprobado";

    // Crear la inspección vinculada al vehículo resultante
    const inspeccion = await (prisma as any).inspeccion.create({
      data: {
        empresaId,
        vehiculoId: vehiculo.id,
        usuarioId,
        conductor: conductor.trim(),
        licencia: licencia.trim(),
        ruta: ruta?.trim() || null,
        kilometraje: kilometraje?.trim() || null,
        concepto,
        checklist,
      },
      select: { id: true, concepto: true, fecha: true },
    });

    return NextResponse.json(
      { ok: true, id: inspeccion.id, concepto: inspeccion.concepto },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST inspecciones error:", error);
    return NextResponse.json({ error: "No fue posible guardar la inspección." }, { status: 500 });
  }
}
