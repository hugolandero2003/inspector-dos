import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público — solo devuelve nombre e id de empresas activas
// (no expone datos sensibles)
export async function GET() {
  const empresas = await (prisma as any).empresa.findMany({
    where: { estado: "activa" },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  });

  return NextResponse.json(empresas);
}
