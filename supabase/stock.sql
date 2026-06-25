-- ============================================================
--  Módulo de Inventario / Existencias (Sellable Products)
--  Ejecutar DESPUÉS de schema.sql y functions.sql
-- ============================================================

create table if not exists public.stock (
  id              uuid primary key,
  code            text,
  descripcion     text,
  familia         text,
  gem_type        text,
  karat           text,
  metal           text,            -- 'oro' | 'plata' | 'otro'
  metal_source    text,            -- 'nuevo' | 'ocasion' | 'desconocido'
  peso_g          numeric,
  gem_weight_g    numeric,
  status          text,            -- DIS, RES, ENV, VEN, ...
  base_price_eur  numeric,
  final_price_eur numeric,         -- PVP
  cost_price_eur  numeric,         -- coste
  discount_eur    numeric,
  taxes_eur       numeric,
  store_name      text,
  location        text,
  created_at      timestamptz,
  updated_at      timestamptz,
  deleted_at      timestamptz,
  synced_at       timestamptz not null default now()
);

create index if not exists idx_stock_status on public.stock (status);
create index if not exists idx_stock_store  on public.stock (store_name);
create index if not exists idx_stock_metal  on public.stock (metal);
create index if not exists idx_stock_familia on public.stock (familia);
create index if not exists idx_stock_created on public.stock (created_at);

-- Snapshots de valoración (para evolución de existencias en el tiempo)
create table if not exists public.stock_snapshots (
  snapshot_date date not null,
  status        text not null,
  store_name    text not null default '(todas)',
  metal         text not null default '(todos)',
  piezas        integer not null,
  valor_pvp     numeric not null,
  valor_coste   numeric not null,
  peso_g        numeric not null,
  primary key (snapshot_date, status, store_name, metal)
);

-- ---------- Funciones de agregación ----------

-- Resumen de existencias para un conjunto de estados
create or replace function public.stock_resumen(p_estados text[])
returns table(
  piezas bigint, valor_pvp numeric, valor_coste numeric,
  peso_oro numeric, peso_plata numeric, peso_total numeric
) language sql stable as $$
  select count(*),
         coalesce(sum(final_price_eur),0),
         coalesce(sum(cost_price_eur),0),
         coalesce(sum(peso_g) filter (where metal='oro'),0),
         coalesce(sum(peso_g) filter (where metal='plata'),0),
         coalesce(sum(peso_g),0)
    from public.stock
   where (p_estados is null or status = any(p_estados));
$$;

-- Desglose por dimensión
create or replace function public.stock_por_dim(p_estados text[], p_dim text)
returns table(
  etiqueta text, piezas bigint, valor_pvp numeric, valor_coste numeric, peso_g numeric
) language plpgsql stable as $$
begin
  if p_dim not in ('status','store_name','familia','metal','metal_source','karat') then
    raise exception 'dimensión no permitida: %', p_dim;
  end if;
  return query execute format($q$
    select coalesce(nullif(trim(%I),''),'(sin dato)'),
           count(*), coalesce(sum(final_price_eur),0),
           coalesce(sum(cost_price_eur),0), coalesce(sum(peso_g),0)
      from public.stock
     where ($1 is null or status = any($1))
     group by 1 order by sum(cost_price_eur) desc nulls last
  $q$, p_dim) using p_estados;
end;
$$;

-- Antigüedad del stock (aging) por tramos
create or replace function public.stock_aging(p_estados text[])
returns table(tramo text, orden int, piezas bigint, valor_coste numeric, valor_pvp numeric)
language sql stable as $$
  with base as (
    select cost_price_eur, final_price_eur,
      case
        when created_at is null then 5
        when created_at > now() - interval '3 months'  then 1
        when created_at > now() - interval '6 months'  then 2
        when created_at > now() - interval '12 months' then 3
        else 4
      end as orden
    from public.stock
    where (p_estados is null or status = any(p_estados))
  )
  select case orden
           when 1 then '0-3 meses' when 2 then '3-6 meses'
           when 3 then '6-12 meses' when 4 then 'Más de 12 meses'
           else 'Sin fecha' end,
         orden, count(*), coalesce(sum(cost_price_eur),0), coalesce(sum(final_price_eur),0)
    from base group by orden order by orden;
$$;

-- Lista de estados presentes (para el selector)
create or replace function public.stock_estados()
returns table(status text, piezas bigint)
language sql stable as $$
  select status, count(*) from public.stock group by status order by count(*) desc;
$$;

-- Evolución de existencias (snapshots)
create or replace function public.stock_evolucion(p_estados text[])
returns table(snapshot_date date, valor_coste numeric, valor_pvp numeric, piezas bigint)
language sql stable as $$
  select snapshot_date, sum(valor_coste), sum(valor_pvp), sum(piezas)
    from public.stock_snapshots
   where (p_estados is null or status = any(p_estados))
   group by snapshot_date order by snapshot_date;
$$;

-- Crea/actualiza el snapshot mensual de valoración (agrupado por estado/tienda/metal)
create or replace function public.crear_snapshot_stock(p_fecha date)
returns integer language plpgsql security definer as $$
declare n integer;
begin
  delete from public.stock_snapshots where snapshot_date = p_fecha;
  insert into public.stock_snapshots (snapshot_date, status, store_name, metal, piezas, valor_pvp, valor_coste, peso_g)
  select p_fecha,
         coalesce(status,'(sin dato)'),
         coalesce(nullif(trim(store_name),''),'(sin dato)'),
         coalesce(metal,'otro'),
         count(*), coalesce(sum(final_price_eur),0),
         coalesce(sum(cost_price_eur),0), coalesce(sum(peso_g),0)
    from public.stock
   group by 1,2,3,4;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.crear_snapshot_stock(date) to authenticated;

-- ---------- RLS ----------
alter table public.stock enable row level security;
alter table public.stock_snapshots enable row level security;
drop policy if exists "auth_read_stock" on public.stock;
create policy "auth_read_stock" on public.stock for select to authenticated using (true);
drop policy if exists "auth_read_stock_snap" on public.stock_snapshots;
create policy "auth_read_stock_snap" on public.stock_snapshots for select to authenticated using (true);

grant select on public.stock, public.stock_snapshots to authenticated;
grant execute on function public.stock_resumen(text[]) to authenticated;
grant execute on function public.stock_por_dim(text[],text) to authenticated;
grant execute on function public.stock_aging(text[]) to authenticated;
grant execute on function public.stock_estados() to authenticated;
grant execute on function public.stock_evolucion(text[]) to authenticated;
