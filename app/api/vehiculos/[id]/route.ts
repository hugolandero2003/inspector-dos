import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req);
  if (!payload) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const vehiculo = await (prisma as any).vehiculo.findFirst({
    where: { id, empresaId: payload.empresaId, estado: true },
    select: {
      id: true, placa: true, interno: true, tipo: true,
      marca: true, linea: true, modelo: true, color: true,
      soat: true, tecnomecanica: true,
    },
  });

  if (!vehiculo) {
    return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
  }

  return NextResponse.json(vehiculo);
}
