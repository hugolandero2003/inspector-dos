import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida");
}

const pool =
  globalForPrisma.pgPool ||
  new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
    max: 5,
  });
const adapter = new PrismaPg(pool);

function hasLeadDelegate(client: PrismaClient) {
  return typeof (client as unknown as { lead?: unknown }).lead !== "undefined";
}

const shouldReusePrisma = globalForPrisma.prisma && hasLeadDelegate(globalForPrisma.prisma);

export const prisma =
  shouldReusePrisma
    ? globalForPrisma.prisma!
    : new PrismaClient({
        adapter,
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
