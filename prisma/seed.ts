import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida para ejecutar el seed");
}

const adapter = new PrismaPg(new Pool({ connectionString: databaseUrl }));
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const empresa = await prisma.empresa.upsert({
    where: { email: "admin@empresa.test" },
    update: {},
    create: {
      nombre: "Empresa Demo",
      nit: "900000000-0",
      email: "admin@empresa.test",
      telefono: "+57 300 000 0000",
      plan: "demo",
      planVence: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      estado: "activa",
    },
  });

  const admin = await prisma.usuario.upsert({
    where: { email: "admin@empresa.test" },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: "Administrador Demo",
      email: "admin@empresa.test",
      password: hashedPassword,
      rol: "admin",
    },
  });

  console.log(`✅ Empresa demo creada/verificada (id: ${empresa.id})`);
  console.log(`✅ Usuario admin creado/verificado (id: ${admin.id})`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
