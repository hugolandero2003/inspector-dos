const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sql = `
    DROP VIEW IF EXISTS vw_inspecciones_admin CASCADE;
    DROP TABLE IF EXISTS "Inspection" CASCADE;
    DROP TABLE IF EXISTS "User" CASCADE;
    DROP TABLE IF EXISTS inspeccion_checklist CASCADE;
    DROP TABLE IF EXISTS inspecciones CASCADE;
    DROP TABLE IF EXISTS vehiculos CASCADE;
    DROP TABLE IF EXISTS usuarios CASCADE;
    DROP TABLE IF EXISTS empresas CASCADE;
  `;
  await pool.query(sql);
  console.log("Tablas viejas eliminadas OK");
  await pool.end();
}

main().catch((e) => {
  console.error(e.message);
  pool.end();
  process.exit(1);
});
