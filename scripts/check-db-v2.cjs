const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function getDirectUrlFromEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const line = raw
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith('DIRECT_URL='));

  if (!line) {
    throw new Error('DIRECT_URL no encontrada en .env');
  }

  return line.replace(/^DIRECT_URL=/, '').trim().replace(/^"|"$/g, '');
}

async function main() {
  const connectionString = process.env.DIRECT_URL || getDirectUrlFromEnvFile();

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('User', 'Inspection', 'vehiculos', 'inspecciones_v2', 'inspeccion_checklist')
    order by table_name;
  `);

  const count = await client.query('select count(*)::int as n from public.inspecciones_v2;');

  console.log('TABLES=' + tables.rows.map((r) => r.table_name).join(','));
  console.log('INSPECCIONES_V2=' + count.rows[0].n);

  await client.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
