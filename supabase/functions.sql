-- ============================================================
--  Vista unificada + funciones de agregación (RPC)
--  Ejecutar DESPUÉS de schema.sql.  Es CREATE OR REPLACE: seguro re-ejecutar.
-- ============================================================

-- Se borra primero porque cambió el orden/columnas (CREATE OR REPLACE no lo permite)
drop view if exists public.operaciones_unificadas;
create view public.operaciones_unificadas as
  select 'ventas'::text as operacion, tipo_operacion, fecha_operacion, codigo, familia_prenda,
         quilate_prenda, origen_metal, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.ventas
  union all
  select 'compras', tipo_operacion, fecha_operacion, codigo, familia_prenda,
         quilate_prenda, null::text, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.compras
  union all
  select 'reservas', tipo_operacion, fecha_operacion, codigo, familia_prenda,
         quilate_prenda, origen_metal, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.reservas
  union all
  select 'recuperables', tipo_operacion, fecha_operacion, codigo, familia_prenda,
         quilate_prenda, null::text, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.recuperables
  union all
  select 'trabajos', tipo_operacion, fecha_operacion, codigo, familia_prenda,
         quilate_prenda, null::text, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.trabajos;

-- Clasifica el metal a partir del quilate
create or replace function public.metal_de(quilate text)
returns text language sql immutable as $$
  select case
    when lower(coalesce(quilate,'')) like '%oro%'   then 'oro'
    when lower(coalesce(quilate,'')) like '%plata%' then 'plata'
    else 'otro' end;
$$;

-- KPIs por operación en un rango de fechas
create or replace function public.kpis_por_operacion(desde timestamptz, hasta timestamptz)
returns table(
  operacion text, euros numeric, gramos_oro numeric, gramos_plata numeric,
  gramos_total numeric, unidades bigint
) language sql stable as $$
  select operacion,
         coalesce(sum(pago_eur),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0),
         coalesce(sum(peso_g),0),
         count(*)
    from public.operaciones_unificadas
   where fecha_operacion >= desde and fecha_operacion < hasta
   group by operacion;
$$;

-- Serie temporal mensual
create or replace function public.serie_mensual(p_operacion text, desde timestamptz, hasta timestamptz)
returns table(mes date, euros numeric, gramos numeric, unidades bigint)
language sql stable as $$
  select date_trunc('month', fecha_operacion)::date,
         coalesce(sum(pago_eur),0), coalesce(sum(peso_g),0), count(*)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
   group by 1 order by 1;
$$;

-- Serie temporal diaria (para el detalle del mes)
create or replace function public.serie_diaria(p_operacion text, desde timestamptz, hasta timestamptz)
returns table(dia date, euros numeric, unidades bigint)
language sql stable as $$
  select date_trunc('day', fecha_operacion)::date,
         coalesce(sum(pago_eur),0), count(*)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
   group by 1 order by 1;
$$;

-- Ranking simple por dimensión (lo usa el dashboard)
create or replace function public.ranking(
  p_operacion text, p_dim text, desde timestamptz, hasta timestamptz, p_limit int default 10
)
returns table(etiqueta text, euros numeric, gramos numeric, unidades bigint)
language plpgsql stable as $$
begin
  if p_dim not in ('tienda','empleado','familia_prenda','plataforma') then
    raise exception 'dimensión no permitida: %', p_dim;
  end if;
  return query execute format($q$
    select coalesce(nullif(trim(%I),''),'(sin dato)'),
           coalesce(sum(pago_eur),0), coalesce(sum(peso_g),0), count(*)
      from public.operaciones_unificadas
     where (%L = 'todas' or operacion = %L)
       and fecha_operacion >= %L and fecha_operacion < %L
     group by 1 order by abs(sum(pago_eur)) desc nulls last limit %s
  $q$, p_dim, p_operacion, p_operacion, desde, hasta, p_limit);
end;
$$;

-- DESGLOSE ANALÍTICO completo por dimensión (contabilidad analítica)
create or replace function public.desglose(
  p_operacion text, p_dim text, desde timestamptz, hasta timestamptz
)
returns table(
  etiqueta text, euros numeric, unidades bigint,
  gramos_oro numeric, gramos_plata numeric, peso_total numeric
) language plpgsql stable as $$
begin
  if p_dim not in (
    'tienda','empleado','familia_prenda','plataforma',
    'metodo_pago','tipo_operacion','quilate_prenda','origen_metal'
  ) then
    raise exception 'dimensión no permitida: %', p_dim;
  end if;
  return query execute format($q$
    select coalesce(nullif(trim(%I),''),'(sin dato)') as etiqueta,
           coalesce(sum(pago_eur),0) as euros,
           count(*) as unidades,
           coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
           coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0),
           coalesce(sum(peso_g),0)
      from public.operaciones_unificadas
     where (%L = 'todas' or operacion = %L)
       and fecha_operacion >= %L and fecha_operacion < %L
     group by 1 order by abs(sum(pago_eur)) desc nulls last
  $q$, p_dim, p_operacion, p_operacion, desde, hasta);
end;
$$;

-- Actividad por día de la semana (0=domingo … 6=sábado)
create or replace function public.actividad_semana(p_operacion text, desde timestamptz, hasta timestamptz)
returns table(dow int, euros numeric, unidades bigint)
language sql stable as $$
  select extract(dow from fecha_operacion)::int,
         coalesce(sum(pago_eur),0), count(*)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
   group by 1 order by 1;
$$;

-- KPIs avanzados de una operación en un rango
create or replace function public.kpis_extra(p_operacion text, desde timestamptz, hasta timestamptz)
returns table(
  tiendas_activas bigint, empleados_activos bigint, peso_medio numeric,
  ticket_max numeric, euros_oro numeric, euros_plata numeric
) language sql stable as $$
  select count(distinct tienda),
         count(distinct empleado),
         coalesce(avg(peso_g) filter (where peso_g > 0),0),
         coalesce(max(abs(pago_eur)),0),
         coalesce(sum(pago_eur) filter (where public.metal_de(quilate_prenda)='oro'),0),
         coalesce(sum(pago_eur) filter (where public.metal_de(quilate_prenda)='plata'),0)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta;
$$;

-- Mapa de calor: actividad por tienda × día de la semana (0=dom) × hora (0-23), hora local Canarias
drop function if exists public.mapa_calor(text, timestamptz, timestamptz);
create or replace function public.mapa_calor(p_operacion text, desde timestamptz, hasta timestamptz)
returns table(tienda text, dow int, hora int, euros numeric, unidades bigint)
language sql stable as $$
  select coalesce(nullif(trim(tienda), ''), '(sin dato)'),
         extract(dow  from (fecha_operacion at time zone 'Atlantic/Canary'))::int,
         extract(hour from (fecha_operacion at time zone 'Atlantic/Canary'))::int,
         coalesce(sum(pago_eur),0), count(*)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
   group by 1, 2, 3;
$$;

grant execute on function public.actividad_semana(text,timestamptz,timestamptz) to authenticated;
grant execute on function public.kpis_extra(text,timestamptz,timestamptz) to authenticated;
grant execute on function public.mapa_calor(text,timestamptz,timestamptz) to authenticated;

-- Rango de fechas disponible
create or replace function public.rango_fechas()
returns table(min_fecha timestamptz, max_fecha timestamptz)
language sql stable as $$
  select min(fecha_operacion), max(fecha_operacion) from public.operaciones_unificadas;
$$;

grant execute on function public.kpis_por_operacion(timestamptz,timestamptz) to authenticated;
grant execute on function public.serie_mensual(text,timestamptz,timestamptz) to authenticated;
grant execute on function public.serie_diaria(text,timestamptz,timestamptz) to authenticated;
grant execute on function public.ranking(text,text,timestamptz,timestamptz,int) to authenticated;
grant execute on function public.desglose(text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.rango_fechas() to authenticated;
grant select on public.operaciones_unificadas to authenticated;
