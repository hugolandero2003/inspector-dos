import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, requireRole } from "@/lib/auth";

// ── PATCH: activar/desactivar vehículo ───────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req);
  if (!requireRole(payload, ["admin", "superadmin"])) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const { estado } = await req.json() as { estado: boolean };

  const vehiculo = await (prisma as any).vehiculo.findFirst({
    where: { id, empresaId: payload.empresaId },
  });
  if (!vehiculo) {
    return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
  }

  const updated = await (prisma as any).vehiculo.update({
    where: { id },
    data: { estado },
    select: { id: true, placa: true, estado: true },
  });

  return NextResponse.json(updated);
}
