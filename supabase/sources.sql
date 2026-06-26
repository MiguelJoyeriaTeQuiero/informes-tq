-- ============================================================
--  Fuentes de sincronización de Metabase (editables desde la app)
--  Ejecutar DESPUÉS de schema.sql
-- ============================================================

create table if not exists public.metabase_sources (
  key             text primary key,        -- 'ventas','compras',... ,'stock'
  label           text not null,
  card_id         integer not null,
  metabase_nombre text,
  tipo            text not null default 'operacion',  -- 'operacion' | 'stock'
  activo          boolean not null default true,
  orden           integer not null default 0,
  updated_at      timestamptz not null default now()
);

insert into public.metabase_sources (key, label, card_id, metabase_nombre, tipo, orden) values
  ('ventas',       'Ventas',              379, 'Informe de Ventas 2026 - JTQ',              'operacion', 1),
  ('compras',      'Compras',             310, 'Informe de Compras 2026 - JTQ',             'operacion', 2),
  ('reservas',     'Reservas',            298, 'Reservas Dashboard v. 2026',                'operacion', 3),
  ('recuperables', 'Ventas Recuperables', 314, 'Informe de Ventas Recuperables 2026 - JTQ', 'operacion', 4),
  ('trabajos',     'Trabajos',            312, 'Informe de Trabajos 2026 - JTQ',            'operacion', 5),
  ('stock',        'Inventario / Existencias', 353, 'Sellable Products',                    'stock',     6)
on conflict (key) do nothing;

alter table public.metabase_sources enable row level security;

-- Lectura: cualquier autenticado
drop policy if exists "sources_read" on public.metabase_sources;
create policy "sources_read" on public.metabase_sources
  for select to authenticated using (true);

-- Escritura: solo admin (usa la función es_admin de schema.sql)
drop policy if exists "sources_admin_write" on public.metabase_sources;
create policy "sources_admin_write" on public.metabase_sources
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

grant select on public.metabase_sources to authenticated;
