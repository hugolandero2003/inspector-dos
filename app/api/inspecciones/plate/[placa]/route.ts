import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function DELETE(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const placa = req.nextUrl.pathname.split("/").pop();
  if (!placa) {
    return NextResponse.json({ error: "Placa faltante." }, { status: 400 });
  }

  try {
    const vehiculo = await (prisma as any).vehiculo.findFirst({
      where: { empresaId: payload.empresaId, placa: placa.trim().toUpperCase() },
      select: { id: true },
    });

    if (!vehiculo) {
      return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
    }

    await (prisma as any).inspeccion.deleteMany({ where: { vehiculoId: vehiculo.id, empresaId: payload.empresaId } });
    await (prisma as any).vehiculo.delete({ where: { id: vehiculo.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE inspecciones placa error:", error);
    return NextResponse.json({ error: "No fue posible eliminar la placa." }, { status: 500 });
  }
}
