-- PESV V2 normalizado para Supabase
-- Objetivo: agregar modelo relacional sin romper la app actual que usa public."Inspection"
-- Estrategia:
-- 1) Crear tablas nuevas (vehiculos, inspecciones_v2, inspeccion_checklist)
-- 2) Migrar datos desde public."Inspection"
-- 3) Mantener tabla legacy intacta

begin;

-- Helpers
create or replace function public.normalize_plate(p text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p, ''), '\\s+', '', 'g'));
$$;

create or replace function public.try_parse_jsonb(raw text)
returns jsonb
language plpgsql
immutable
as $$
begin
  return coalesce(raw, '[]')::jsonb;
exception
  when others then
    return '[]'::jsonb;
end;
$$;

-- 1) Vehiculos (catálogo vivo por placa)
create table if not exists public.vehiculos (
  id bigserial primary key,
  placa text not null,
  interno text not null,
  tipo text not null,
  marca text not null,
  linea text not null,
  modelo text not null,
  ruta text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vehiculos_placa_format_chk
    check (placa = public.normalize_plate(placa))
);

create unique index if not exists vehiculos_placa_key
  on public.vehiculos (placa);

-- 2) Inspecciones v2 (hechos)
create table if not exists public.inspecciones_v2 (
  id text primary key,
  legacy_inspection_id text unique,
  vehiculo_id bigint not null references public.vehiculos(id) on delete restrict,
  user_id bigint null references public."User"(id) on delete set null,

  conductor text not null,
  licencia_conduccion text not null,
  inspector text not null,

  kilometraje text not null,
  fecha_inspeccion date not null,
  hora_inspeccion time not null,

  concepto text not null,
  observaciones text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inspecciones_v2_concepto_chk
    check (concepto in ('Apto', 'Apto con observaciones', 'No apto')),

  constraint inspecciones_v2_unique_daily
    unique (vehiculo_id, fecha_inspeccion)
);

create index if not exists inspecciones_v2_created_at_idx
  on public.inspecciones_v2 (created_at desc);

create index if not exists inspecciones_v2_fecha_idx
  on public.inspecciones_v2 (fecha_inspeccion);

create index if not exists inspecciones_v2_vehiculo_created_idx
  on public.inspecciones_v2 (vehiculo_id, created_at desc);

create index if not exists inspecciones_v2_user_idx
  on public.inspecciones_v2 (user_id);

-- 3) Checklist por item (detalle relacional)
create table if not exists public.inspeccion_checklist (
  id bigserial primary key,
  inspeccion_id text not null references public.inspecciones_v2(id) on delete cascade,
  item_id text not null,
  item_label text not null,
  seccion text,
  criticidad text not null,
  estado text not null,
  vencimiento date,
  orden smallint,

  constraint inspeccion_checklist_estado_chk
    check (estado in ('Cumple', 'No cumple', 'No aplica')),

  constraint inspeccion_checklist_criticidad_chk
    check (criticidad in ('Critico', 'No critico')),

  constraint inspeccion_checklist_unique_item
    unique (inspeccion_id, item_id)
);

create index if not exists inspeccion_checklist_inspeccion_idx
  on public.inspeccion_checklist (inspeccion_id);

create index if not exists inspeccion_checklist_estado_idx
  on public.inspeccion_checklist (estado);

-- 4) Trigger generic updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vehiculos_touch_updated_at on public.vehiculos;
create trigger trg_vehiculos_touch_updated_at
before update on public.vehiculos
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_inspecciones_v2_touch_updated_at on public.inspecciones_v2;
create trigger trg_inspecciones_v2_touch_updated_at
before update on public.inspecciones_v2
for each row
execute function public.touch_updated_at();

-- 5) Migración desde legacy public."Inspection"
-- 5.1 Vehiculos
insert into public.vehiculos (placa, interno, tipo, marca, linea, modelo, ruta)
select
  public.normalize_plate(i.placa) as placa,
  i.interno,
  i.tipo,
  i.marca,
  i.linea,
  i.modelo,
  i.ruta
from public."Inspection" i
on conflict (placa) do update
set
  interno = excluded.interno,
  tipo = excluded.tipo,
  marca = excluded.marca,
  linea = excluded.linea,
  modelo = excluded.modelo,
  ruta = excluded.ruta,
  updated_at = now();

-- 5.2 Inspecciones v2
insert into public.inspecciones_v2 (
  id,
  legacy_inspection_id,
  vehiculo_id,
  user_id,
  conductor,
  licencia_conduccion,
  inspector,
  kilometraje,
  fecha_inspeccion,
  hora_inspeccion,
  concepto,
  observaciones,
  created_at,
  updated_at
)
select
  i.id,
  i.id as legacy_inspection_id,
  v.id as vehiculo_id,
  i."userId" as user_id,
  i.conductor,
  i.licencia,
  i.inspector,
  i.kilometraje,
  i.fecha::date,
  i.hora::time,
  i.concepto,
  coalesce(i.observaciones, ''),
  i."createdAt",
  now()
from public."Inspection" i
join public.vehiculos v
  on v.placa = public.normalize_plate(i.placa)
on conflict (id) do update
set
  vehiculo_id = excluded.vehiculo_id,
  user_id = excluded.user_id,
  conductor = excluded.conductor,
  licencia_conduccion = excluded.licencia_conduccion,
  inspector = excluded.inspector,
  kilometraje = excluded.kilometraje,
  fecha_inspeccion = excluded.fecha_inspeccion,
  hora_inspeccion = excluded.hora_inspeccion,
  concepto = excluded.concepto,
  observaciones = excluded.observaciones,
  updated_at = now();

-- 5.3 Checklist detallado (reconstrucción idempotente)
delete from public.inspeccion_checklist ck
where exists (
  select 1
  from public.inspecciones_v2 iv2
  where iv2.id = ck.inspeccion_id
    and iv2.legacy_inspection_id is not null
);

insert into public.inspeccion_checklist (
  inspeccion_id,
  item_id,
  item_label,
  seccion,
  criticidad,
  estado,
  vencimiento,
  orden
)
select
  i.id as inspeccion_id,
  coalesce(elem ->> 'id', 'item_' || ord::text) as item_id,
  coalesce(elem ->> 'item', 'Sin etiqueta') as item_label,
  nullif(elem ->> 'seccion', '') as seccion,
  case
    when (elem ->> 'criticidad') in ('Critico', 'No critico') then elem ->> 'criticidad'
    else 'No critico'
  end as criticidad,
  case
    when (elem ->> 'estado') in ('Cumple', 'No cumple', 'No aplica') then elem ->> 'estado'
    else 'No aplica'
  end as estado,
  case
    when coalesce(elem ->> 'vencimiento', '') ~ '^\\d{4}-\\d{2}-\\d{2}$' then (elem ->> 'vencimiento')::date
    else null
  end as vencimiento,
  ord::smallint
from public."Inspection" i
cross join lateral jsonb_array_elements(public.try_parse_jsonb(i.checklist)) with ordinality as x(elem, ord)
on conflict (inspeccion_id, item_id) do update
set
  item_label = excluded.item_label,
  seccion = excluded.seccion,
  criticidad = excluded.criticidad,
  estado = excluded.estado,
  vencimiento = excluded.vencimiento,
  orden = excluded.orden;

-- 6) Vista de lectura para analytics y consultas limpias
create or replace view public.vw_inspecciones_admin as
select
  iv2.id,
  v.placa,
  v.interno,
  v.tipo,
  v.marca,
  v.linea,
  v.modelo,
  iv2.kilometraje,
  v.ruta,
  iv2.conductor,
  iv2.licencia_conduccion as licencia,
  iv2.inspector,
  iv2.fecha_inspeccion,
  iv2.hora_inspeccion,
  iv2.concepto,
  iv2.observaciones,
  iv2.created_at,
  iv2.user_id,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ck.item_id,
        'item', ck.item_label,
        'seccion', ck.seccion,
        'criticidad', ck.criticidad,
        'estado', ck.estado,
        'vencimiento', to_char(ck.vencimiento, 'YYYY-MM-DD')
      )
      order by ck.orden
    ) filter (where ck.id is not null),
    '[]'::jsonb
  ) as checklist
from public.inspecciones_v2 iv2
join public.vehiculos v on v.id = iv2.vehiculo_id
left join public.inspeccion_checklist ck on ck.inspeccion_id = iv2.id
group by
  iv2.id,
  v.placa,
  v.interno,
  v.tipo,
  v.marca,
  v.linea,
  v.modelo,
  iv2.kilometraje,
  v.ruta,
  iv2.conductor,
  iv2.licencia_conduccion,
  iv2.inspector,
  iv2.fecha_inspeccion,
  iv2.hora_inspeccion,
  iv2.concepto,
  iv2.observaciones,
  iv2.created_at,
  iv2.user_id;

commit;

-- Ejecutar después de 01_schema_pesv.sql
-- Este archivo no reemplaza la tabla legacy; la app actual sigue funcionando igual.
