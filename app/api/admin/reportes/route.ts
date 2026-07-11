import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!requireRole(payload, ["admin", "superadmin"])) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const placa  = searchParams.get("placa")?.trim().toUpperCase() || undefined;
  const desde  = searchParams.get("desde") || undefined;
  const hasta  = searchParams.get("hasta") || undefined;
  const pagina = Math.max(1, parseInt(searchParams.get("pagina") ?? "1"));
  const limite = 20;

  const where: Record<string, unknown> = { empresaId: payload.empresaId };

  if (placa) where.vehiculo = { placa };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) (where.fecha as Record<string, unknown>).gte = new Date(desde);
    if (hasta) {
      const d = new Date(hasta); d.setHours(23, 59, 59, 999);
      (where.fecha as Record<string, unknown>).lte = d;
    }
  }

  const [total, inspecciones] = await Promise.all([
    (prisma as any).inspeccion.count({ where }),
    (prisma as any).inspeccion.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * limite,
      take: limite,
      select: {
        id: true, concepto: true, conductor: true, kilometraje: true, fecha: true,
        vehiculo: { select: { placa: true, tipo: true, marca: true } },
        usuario:  { select: { nombre: true } },
        checklist: true,
      },
    }),
  ]);

  return NextResponse.json({
    total,
    paginas: Math.ceil(total / limite),
    pagina,
    inspecciones,
  });
}
