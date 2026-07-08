import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/\s+/g, "").trim();
}

function getBogotaDateString(baseDate = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(baseDate);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placa: string }> }
) {
  const { placa } = await params;
  const normalizedPlate = normalizePlate(decodeURIComponent(placa));
  const requestedDate = req.nextUrl.searchParams.get("date")?.trim() || "";
  const targetDate = requestedDate || getBogotaDateString();

  if (!normalizedPlate) {
    return NextResponse.json({ error: "Placa invalida" }, { status: 400 });
  }

  try {
    const inspectionForDate = await prisma.inspection.findFirst({
      where: {
        placa: normalizedPlate,
        fecha: targetDate,
      },
      select: {
        id: true,
      },
    });

    const latestInspection = await prisma.inspection.findFirst({
      where: { placa: normalizedPlate },
      orderBy: { createdAt: "desc" },
      select: {
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
        checklist: true,
      },
    });

    if (!latestInspection) {
      return NextResponse.json({ error: "Sin historial para la placa" }, { status: 404 });
    }

    return NextResponse.json({
      ...latestInspection,
      alreadyRegisteredForDate: Boolean(inspectionForDate),
      validationDate: targetDate,
    });
  } catch (err) {
    console.error("GET inspection by plate error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ placa: string }> },
) {
  const { placa } = await params;
  const normalizedPlate = normalizePlate(decodeURIComponent(placa));

  if (!normalizedPlate) {
    return NextResponse.json({ error: "Placa invalida" }, { status: 400 });
  }

  try {
    await prisma.inspection.deleteMany({
      where: { placa: normalizedPlate },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE inspection by plate error:", err);
    return NextResponse.json({ error: "No fue posible eliminar la placa" }, { status: 500 });
  }
}
