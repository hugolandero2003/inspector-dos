import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

function readEnvVar(name: string) {
  const envPath = path.join(process.cwd(), ".env");
  const raw = fs.readFileSync(envPath, "utf8");
  const line = raw.split(/\r?\n/).find((l) => l.startsWith(name + "="));
  if (!line) return undefined;
  return line.replace(name + "=", "").trim().replace(/^"|"$/g, "");
}

const databaseUrl = process.env.DATABASE_URL || readEnvVar("DATABASE_URL");
if (!databaseUrl) {
  throw new Error("DATABASE_URL no encontrada");
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(Object.keys(prisma).filter((k) => !k.startsWith("$")));

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
