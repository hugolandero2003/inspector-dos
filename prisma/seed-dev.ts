/**
 * Seed de desarrollo — Inspector PESV
 * Crea superadmin, empresa demo con admin y operador, y vehículos de prueba.
 * Ejecutar: npx tsx prisma/seed-dev.ts
 */

import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("🌱 Iniciando seed de desarrollo...\n");

  // ── 1. Empresa HALM (para el superadmin) ──────────────────────────────────
  const empresaHALM = await (prisma as any).empresa.upsert({
    where: { email: "admin@halm.co" },
    update: {},
    create: {
      nombre: "HALM",
      email: "admin@halm.co",
      plan: "activo",
      estado: "activa",
    },
  });

  const hashSuper = await bcrypt.hash("halm2025!", 12);
  const superadmin = await (prisma as any).usuario.upsert({
    where: { email: "superadmin@halm.co" },
    update: {},
    create: {
      empresaId: empresaHALM.id,
      nombre: "Super Admin HALM",
      email: "superadmin@halm.co",
      password: hashSuper,
      rol: "superadmin",
    },
  });
  console.log(`✅ Superadmin creado: ${superadmin.email}`);

  // ── 2. Empresa de prueba ───────────────────────────────────────────────────
  const demoVence = new Date();
  demoVence.setDate(demoVence.getDate() + 8);

  const empresaDemo = await (prisma as any).empresa.upsert({
    where: { email: "contacto@transportesdemo.co" },
    update: {},
    create: {
      nombre: "Transportes Demo S.A.S.",
      nit: "900123456-1",
      email: "contacto@transportesdemo.co",
      telefono: "+57 3001234567",
      plan: "demo",
      planVence: demoVence,
      estado: "activa",
    },
  });

  const hashAdmin = await bcrypt.hash("admin123!", 12);
  const adminDemo = await (prisma as any).usuario.upsert({
    where: { email: "admin@transportesdemo.co" },
    update: {},
    create: {
      empresaId: empresaDemo.id,
      nombre: "Carlos Ramírez",
      email: "admin@transportesdemo.co",
      password: hashAdmin,
      rol: "admin",
    },
  });
  console.log(`✅ Admin empresa demo: ${adminDemo.email}  /  contraseña: admin123!`);

  const hashOp = await bcrypt.hash("op123!", 12);
  const operador = await (prisma as any).usuario.upsert({
    where: { email: "operador@transportesdemo.co" },
    update: {},
    create: {
      empresaId: empresaDemo.id,
      nombre: "Ana Torres",
      email: "operador@transportesdemo.co",
      password: hashOp,
      rol: "operador",
    },
  });
  console.log(`✅ Operador empresa demo: ${operador.email}  /  contraseña: op123!`);

  // ── 3. Vehículos demo ──────────────────────────────────────────────────────
  await (prisma as any).vehiculo.createMany({
    skipDuplicates: true,
    data: [
      {
        empresaId: empresaDemo.id,
        placa: "ABC123",
        interno: "01",
        tipo: "camion",
        marca: "Chevrolet",
        linea: "NHR",
        modelo: "2020",
        color: "Blanco",
      },
      {
        empresaId: empresaDemo.id,
        placa: "XYZ789",
        interno: "02",
        tipo: "buseta",
        marca: "Hyundai",
        linea: "County",
        modelo: "2021",
        color: "Gris",
      },
    ],
  });
  console.log("✅ Vehículos demo creados: ABC123, XYZ789");

  console.log("\n🎉 Seed completado.");
  console.log("─────────────────────────────────────────────────────");
  console.log("Superadmin  :  superadmin@halm.co        /  halm2025!");
  console.log("Admin demo  :  admin@transportesdemo.co  /  admin123!");
  console.log("Operador    :  operador@transportesdemo.co  /  op123!");
  console.log("─────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", (e as Error).message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
