import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromRequest, requireRole } from "@/lib/auth";

// ── GET: listar vehículos de la empresa ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!requireRole(payload, ["admin", "superadmin"])) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const vehiculos = await (prisma as any).vehiculo.findMany({
    where: { empresaId: payload.empresaId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, placa: true, interno: true, tipo: true,
      marca: true, linea: true, modelo: true, color: true,
      estado: true, createdAt: true,
      _count: { select: { inspecciones: true } },
    },
  });

  return NextResponse.json(vehiculos);
}

// ── POST: crear vehículo ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const payload = getTokenFromRequest(req);
  if (!requireRole(payload, ["admin", "superadmin"])) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const { placa, interno, tipo, marca, linea, modelo, color } = body as Record<string, string>;

  if (!placa?.trim() || !tipo?.trim() || !marca?.trim()) {
    return NextResponse.json({ error: "Placa, tipo y marca son obligatorios." }, { status: 400 });
  }

  const existe = await (prisma as any).vehiculo.findFirst({
    where: { empresaId: payload.empresaId, placa: placa.trim().toUpperCase() },
  });
  if (existe) {
    return NextResponse.json({ error: `La placa ${placa.toUpperCase()} ya está registrada.` }, { status: 409 });
  }

  const vehiculo = await (prisma as any).vehiculo.create({
    data: {
      empresaId: payload.empresaId,
      placa: placa.trim().toUpperCase(),
      interno: interno?.trim() || null,
      tipo: tipo.trim(),
      marca: marca.trim(),
      linea: linea?.trim() || null,
      modelo: modelo?.trim() || null,
      color: color?.trim() || null,
    },
  });

  return NextResponse.json(vehiculo, { status: 201 });
}
