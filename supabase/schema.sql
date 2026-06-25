-- ============================================================
--  Esquema Supabase — Informes Financieros Joyerías Te Quiero
--  Ejecutar en: Supabase Studio → SQL Editor
-- ============================================================

-- ---------- Roles y perfiles de usuario ----------
create table if not exists public.roles (
  name        text primary key,            -- 'admin', 'financiero', 'direccion', 'lectura'
  label       text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

insert into public.roles (name, label, permissions) values
  ('admin',      'Administrador',        '{"config":true,"usuarios":true,"sync":true,"ppt":true,"todo":true}'),
  ('financiero', 'Director financiero',  '{"config":false,"usuarios":false,"sync":true,"ppt":true,"todo":true}'),
  ('direccion',  'Dirección / Comité',   '{"config":false,"usuarios":false,"sync":false,"ppt":true,"todo":false}'),
  ('lectura',    'Solo lectura',         '{"config":false,"usuarios":false,"sync":false,"ppt":false,"todo":false}')
on conflict (name) do nothing;

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'lectura' references public.roles(name),
  created_at timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando se da de alta un usuario en Supabase Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'lectura')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Tablas de operaciones ----------
create table if not exists public.ventas (
  row_hash          text primary key,
  tipo_operacion    text,
  fecha_operacion   timestamptz,
  codigo            text,
  codigo_dev        text,
  codigo_prenda     text,
  codigo_ve_asociada text,
  descripcion_prenda text,
  familia_prenda    text,
  quilate_prenda    text,
  origen_metal      text,
  peso_g            numeric,
  pago_eur          numeric,
  metodo_pago       text,
  tienda            text,
  empleado          text,
  plataforma        text,
  source            text not null default 'metabase',
  synced_at         timestamptz not null default now()
);

create table if not exists public.compras (
  row_hash          text primary key,
  tipo_operacion    text,
  fecha_operacion   timestamptz,
  codigo            text,
  descripcion_prenda text,
  familia_prenda    text,
  quilate_prenda    text,
  peso_g            numeric,
  pago_eur          numeric,
  metodo_pago       text,
  tienda            text,
  empleado          text,
  plataforma        text,
  source            text not null default 'metabase',
  synced_at         timestamptz not null default now()
);

create table if not exists public.recuperables (
  row_hash          text primary key,
  tipo_operacion    text,
  fecha_operacion   timestamptz,
  codigo            text,
  descripcion_prenda text,
  familia_prenda    text,
  quilate_prenda    text,
  peso_g            numeric,
  pago_eur          numeric,
  metodo_pago       text,
  tienda            text,
  empleado          text,
  plataforma        text,
  source            text not null default 'metabase',
  synced_at         timestamptz not null default now()
);

create table if not exists public.trabajos (
  row_hash          text primary key,
  tipo_operacion    text,
  fecha_operacion   timestamptz,
  codigo            text,
  descripcion_trabajo text,
  descripcion_prenda text,
  familia_prenda    text,
  quilate_prenda    text,
  peso_g            numeric,
  pago_eur          numeric,
  metodo_pago       text,
  tienda            text,
  empleado          text,
  plataforma        text,
  source            text not null default 'metabase',
  synced_at         timestamptz not null default now()
);

create table if not exists public.reservas (
  row_hash          text primary key,
  tipo_operacion    text,                  -- "Tipo de transacción RS"
  fecha_operacion   timestamptz,           -- created_at
  codigo            text,                  -- code
  codigo_ver        text,
  codigo_der        text,
  codigo_prenda     text,                  -- Codigo
  descripcion_prenda text,
  familia_prenda    text,
  quilate_prenda    text,
  origen_metal      text,
  peso_g            numeric,
  pago_eur          numeric,
  descuento_eur     numeric,
  metodo_pago       text,
  tienda            text,
  empleado          text,
  plataforma        text,
  cliente_id        text,
  cliente_nombre    text,
  cliente_email     text,
  cliente_telefono  text,
  cliente_genero    text,
  cliente_ciudad    text,
  cliente_provincia text,
  cliente_cp        text,
  source            text not null default 'metabase',
  synced_at         timestamptz not null default now()
);

-- Índices por fecha y tienda (acelera dashboards y filtros)
create index if not exists idx_ventas_fecha       on public.ventas (fecha_operacion);
create index if not exists idx_ventas_tienda       on public.ventas (tienda);
create index if not exists idx_compras_fecha       on public.compras (fecha_operacion);
create index if not exists idx_compras_tienda      on public.compras (tienda);
create index if not exists idx_recuperables_fecha  on public.recuperables (fecha_operacion);
create index if not exists idx_trabajos_fecha      on public.trabajos (fecha_operacion);
create index if not exists idx_reservas_fecha      on public.reservas (fecha_operacion);
create index if not exists idx_reservas_tienda     on public.reservas (tienda);

-- ---------- Registro de sincronizaciones ----------
create table if not exists public.sync_log (
  id            bigint generated always as identity primary key,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running',  -- running | ok | error
  triggered_by  text,                              -- 'cron' | email del usuario
  detail        jsonb not null default '{}'::jsonb,
  rows_total    integer
);

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.roles         enable row level security;
alter table public.ventas        enable row level security;
alter table public.compras       enable row level security;
alter table public.recuperables  enable row level security;
alter table public.trabajos      enable row level security;
alter table public.reservas      enable row level security;
alter table public.sync_log      enable row level security;

-- Lectura: cualquier usuario autenticado puede leer los datos (gating de rol en la app).
do $$
declare t text;
begin
  foreach t in array array['ventas','compras','recuperables','trabajos','reservas','sync_log','roles']
  loop
    execute format('drop policy if exists "auth_read_%1$s" on public.%1$s;', t);
    execute format('create policy "auth_read_%1$s" on public.%1$s for select to authenticated using (true);', t);
  end loop;
end $$;

-- Función SECURITY DEFINER para comprobar admin sin recursión de RLS
create or replace function public.es_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.es_admin() to authenticated;

-- Perfiles: cada usuario ve el suyo; los admins ven todos.
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select to authenticated using (id = auth.uid() or public.es_admin());

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- NOTA: las escrituras de datos (sync, migración) se hacen con la SERVICE ROLE KEY,
-- que omite RLS. Por eso no hay políticas de insert/update para usuarios normales.
