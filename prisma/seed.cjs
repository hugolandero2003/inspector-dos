const bcrypt = require("bcryptjs");

async function seed() {
  const { PrismaClient } = require("../app/generated/prisma");
  const prisma = new PrismaClient();
  try {
    const hashed = await bcrypt.hash("admin123", 12);
    const user = await prisma.user.upsert({
      where: { username: "admin" },
      update: {},
      create: { username: "admin", password: hashed },
    });
    console.log("Usuario admin creado:", user.username, "(id:", user.id + ")");
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((e) => { console.error(e); process.exit(1); });
