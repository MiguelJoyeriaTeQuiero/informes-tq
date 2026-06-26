-- ============================================================
--  Objetivos de facturación (mensuales, global y por tienda)
--  Ejecutar DESPUÉS de schema.sql
-- ============================================================

create table if not exists public.objetivos (
  anio       integer not null,
  mes        integer not null,           -- 0-11
  ambito     text not null default 'global',  -- 'global' | nombre de tienda
  objetivo   numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (anio, mes, ambito)
);

alter table public.objetivos enable row level security;
drop policy if exists "objetivos_read" on public.objetivos;
create policy "objetivos_read" on public.objetivos for select to authenticated using (true);

grant select on public.objetivos to authenticated;
-- Las escrituras se hacen con la service role desde server actions (rol gestor).
