-- ============================================================
--  FIX: recursión en las políticas RLS de profiles
--  Ejecutar en Supabase → SQL Editor (una vez)
-- ============================================================

-- Función que comprueba si el usuario actual es admin SIN disparar RLS
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.es_admin() to authenticated;

-- Recrea las políticas usando la función (sin auto-referencia recursiva)
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.es_admin());

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());
