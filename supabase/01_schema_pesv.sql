-- PESV / Inspector de Carros - esquema recomendado para Supabase (PostgreSQL)
-- Este script es idempotente y esta alineado con el codigo actual:
-- - Login admin usa tabla "User"
-- - Formulario y panel admin usan tabla "Inspection"
-- - Se evita duplicidad diaria por placa+fecha

begin;

-- 1) Tabla de usuarios administradores
create table if not exists public."User" (
  id bigserial primary key,
  username text not null,
  password text not null,
  "createdAt" timestamptz not null default now()
);

-- Indice unico para login por usuario
create unique index if not exists "User_username_key"
  on public."User" (username);

-- 2) Tabla de inspecciones
create table if not exists public."Inspection" (
  id text primary key,
  placa text not null,
  interno text not null,
  tipo text not null,
  marca text not null,
  linea text not null,
  modelo text not null,
  kilometraje text not null,
  ruta text not null,
  conductor text not null,
  licencia text not null,
  inspector text not null,
  fecha text not null,
  hora text not null,
  concepto text not null,
  observaciones text not null default '',
  checklist text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "userId" bigint null references public."User"(id) on delete set null,

  -- Validaciones de dominio usadas por frontend/admin
  constraint "Inspection_concepto_chk"
    check (concepto in ('Apto', 'Apto con observaciones', 'No apto')),

  -- La app normaliza placa en mayusculas y sin espacios
  constraint "Inspection_placa_format_chk"
    check (placa = upper(regexp_replace(placa, '\\s+', '', 'g')))
);

-- 3) Limpieza preventiva de duplicados historicos antes de forzar unicidad diaria
-- Conserva el registro mas reciente por placa+fecha
with ranked as (
  select
    id,
    row_number() over (
      partition by placa, fecha
      order by "createdAt" desc, id desc
    ) as rn
  from public."Inspection"
)
delete from public."Inspection" i
using ranked r
where i.id = r.id
  and r.rn > 1;

-- 4) Restriccion de negocio: 1 inspeccion por placa por fecha
create unique index if not exists "Inspection_placa_fecha_key"
  on public."Inspection" (placa, fecha);

-- 5) Indices para consultas del formulario y panel admin
create index if not exists "Inspection_createdAt_idx"
  on public."Inspection" ("createdAt" desc);

create index if not exists "Inspection_placa_createdAt_idx"
  on public."Inspection" (placa, "createdAt" desc);

create index if not exists "Inspection_fecha_idx"
  on public."Inspection" (fecha);

create index if not exists "Inspection_userId_idx"
  on public."Inspection" ("userId");

-- 6) Trigger para updatedAt
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists trg_inspection_set_updated_at on public."Inspection";
create trigger trg_inspection_set_updated_at
before update on public."Inspection"
for each row
execute function public.set_updated_at();

commit;

-- Seed minimo sugerido (opcional) para crear admin manual desde SQL:
-- Nota: bcrypt debe generarse fuera de SQL. Recomendado usar prisma/seed.ts
-- insert into public."User" (username, password)
-- values ('admin', '<hash_bcrypt>')
-- on conflict (username) do nothing;
