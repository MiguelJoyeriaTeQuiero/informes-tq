-- ============================================================
--  Módulo Departamento de Compras (11 informes, almacenamiento genérico)
--  Ejecutar DESPUÉS de schema.sql
-- ============================================================

create table if not exists public.compras_filas (
  id        bigint generated always as identity primary key,
  reporte   text not null,
  fila      jsonb not null,
  synced_at timestamptz not null default now()
);
create index if not exists idx_compras_filas_reporte on public.compras_filas (reporte);

create table if not exists public.compras_snapshots (
  reporte       text not null,
  snapshot_date date not null,
  metricas      jsonb not null,
  primary key (reporte, snapshot_date)
);

-- Suma de una columna numérica (ignora valores no numéricos)
create or replace function public.compras_sum(p_reporte text, p_col text)
returns numeric language sql stable as $$
  select coalesce(sum((fila->>p_col)::numeric), 0)
    from public.compras_filas
   where reporte = p_reporte and (fila->>p_col) ~ '^-?[0-9]+(\.[0-9]+)?$';
$$;

-- Total de filas de un informe
create or replace function public.compras_total(p_reporte text)
returns bigint language sql stable as $$
  select count(*) from public.compras_filas where reporte = p_reporte;
$$;

-- Desglose por dimensión sumando una métrica
create or replace function public.compras_desglose(p_reporte text, p_dim text, p_metrica text)
returns table(etiqueta text, valor numeric, filas bigint)
language sql stable as $$
  select coalesce(nullif(trim(fila->>p_dim), ''), '(sin dato)'),
         coalesce(sum((fila->>p_metrica)::numeric) filter (where (fila->>p_metrica) ~ '^-?[0-9]+(\.[0-9]+)?$'), 0),
         count(*)
    from public.compras_filas
   where reporte = p_reporte
   group by 1 order by 2 desc nulls last;
$$;

-- Conteo de filas por valor de una columna (p. ej. Estado)
create or replace function public.compras_conteo(p_reporte text, p_col text)
returns table(etiqueta text, filas bigint)
language sql stable as $$
  select coalesce(nullif(trim(fila->>p_col), ''), '(sin dato)'), count(*)
    from public.compras_filas
   where reporte = p_reporte
   group by 1 order by 2 desc;
$$;

alter table public.compras_filas enable row level security;
alter table public.compras_snapshots enable row level security;
drop policy if exists "compras_filas_read" on public.compras_filas;
create policy "compras_filas_read" on public.compras_filas for select to authenticated using (true);
drop policy if exists "compras_snap_read" on public.compras_snapshots;
create policy "compras_snap_read" on public.compras_snapshots for select to authenticated using (true);

grant select on public.compras_filas, public.compras_snapshots to authenticated;
grant execute on function public.compras_sum(text,text) to authenticated;
grant execute on function public.compras_total(text) to authenticated;
grant execute on function public.compras_desglose(text,text,text) to authenticated;
grant execute on function public.compras_conteo(text,text) to authenticated;
