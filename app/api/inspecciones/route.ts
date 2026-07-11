import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { vehiculoId, conductor, licencia, ruta, kilometraje, checklist } = body as {
      vehiculoId?: string;
      conductor?: string;
      licencia?: string;
      ruta?: string;
      kilometraje?: string;
      checklist?: Array<{ id: string; item: string; categoria: string; estado: "ok" | "falla" | "na"; obs: string }>;
    };

    if (!vehiculoId || !conductor || !licencia || !checklist?.length) {
      return NextResponse.json(
        { error: "Vehículo, conductor, licencia y checklist son obligatorios." },
        { status: 400 }
      );
    }

    // Verificar que el vehículo pertenece a la empresa del usuario
    const vehiculo = await (prisma as any).vehiculo.findFirst({
      where: { id: vehiculoId, empresaId: payload.empresaId, estado: true },
      select: { id: true },
    });

    if (!vehiculo) {
      return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
    }

    // Calcular concepto: rechazado si hay alguna "falla", aprobado_con_novedad si no crítico
    const hasFalla = checklist.some((i) => i.estado === "falla");
    const concepto = hasFalla ? "rechazado" : "aprobado";

    const inspeccion = await (prisma as any).inspeccion.create({
      data: {
        empresaId: payload.empresaId,
        vehiculoId,
        usuarioId: payload.usuarioId,
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
