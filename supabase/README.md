# Supabase SQL - Orden recomendado

1. Ejecutar `supabase/01_schema_pesv.sql`
2. Ejecutar `supabase/02_schema_pesv_v2_normalized.sql`
3. Ejecutar `supabase/03_leads.sql`
4. Correr seed local para admin:
   - `npm run db:seed`

## Qué queda funcionando

- Modelo actual (legacy) usado por la app:
  - `public."User"`
  - `public."Inspection"`

- Modelo V2 normalizado para escalar reportes y operaciones:
  - `public.vehiculos`
  - `public.inspecciones_v2`
  - `public.inspeccion_checklist`
  - `public.vw_inspecciones_admin`

- Captura comercial de landing:
  - `public."Lead"`

## Nota de compatibilidad

La app actual sigue leyendo/escribiendo en `public."Inspection"`, por lo que no se rompe nada al aplicar V2.
El script V2 solo agrega estructura normalizada y migra datos para analítica/mejora progresiva.
