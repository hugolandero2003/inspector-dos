-- Tabla de leads comerciales para landing SaaS

begin;

create table if not exists public."Lead" (
  id text primary key,
  nombre text not null,
  empresa text not null,
  cargo text null,
  email text not null,
  telefono text not null,
  "tamanoFlota" text null,
  interes text not null,
  mensaje text null,
  "createdAt" timestamptz not null default now(),

  constraint "Lead_interes_chk"
    check (interes in ('demo-8-dias', 'suscripcion', 'ambas'))
);

create unique index if not exists "Lead_email_key"
  on public."Lead" (email);

create index if not exists "Lead_createdAt_idx"
  on public."Lead" ("createdAt" desc);

commit;
