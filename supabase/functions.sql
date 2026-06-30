-- ============================================================
--  Vista unificada + funciones de agregación (RPC)
--  Ejecutar DESPUÉS de schema.sql.  Es re-ejecutable.
--  v2: las funciones aceptan un filtro de tienda opcional (p_tienda).
-- ============================================================

drop view if exists public.operaciones_unificadas;
create view public.operaciones_unificadas as
  select 'ventas'::text as operacion, tipo_operacion, fecha_operacion, codigo, descripcion_prenda, familia_prenda,
         quilate_prenda, origen_metal, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.ventas
  union all
  select 'compras', tipo_operacion, fecha_operacion, codigo, descripcion_prenda, familia_prenda,
         quilate_prenda, null::text, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.compras
  union all
  select 'reservas', tipo_operacion, fecha_operacion, codigo, descripcion_prenda, familia_prenda,
         quilate_prenda, origen_metal, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.reservas
  union all
  select 'recuperables', tipo_operacion, fecha_operacion, codigo, descripcion_prenda, familia_prenda,
         quilate_prenda, null::text, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.recuperables
  union all
  select 'trabajos', tipo_operacion, fecha_operacion, codigo, descripcion_prenda, familia_prenda,
         quilate_prenda, null::text, peso_g, pago_eur, metodo_pago, tienda, empleado, plataforma
    from public.trabajos;

create or replace function public.metal_de(quilate text)
returns text language sql immutable as $$
  select case
    when lower(coalesce(quilate,'')) like '%oro%'   then 'oro'
    when lower(coalesce(quilate,'')) like '%plata%' then 'plata'
    when upper(coalesce(quilate,'')) like 'AU%'     then 'oro'    -- p. ej. AU18, AU24 (reservas)
    when upper(coalesce(quilate,'')) like 'AG%'     then 'plata'  -- p. ej. AG926, AG1000
    else 'otro' end;
$$;

-- Las firmas cambian (añaden p_tienda) → hay que borrar las versiones antiguas
drop function if exists public.kpis_por_operacion(timestamptz, timestamptz);
drop function if exists public.serie_mensual(text, timestamptz, timestamptz);
drop function if exists public.serie_mensual(text, timestamptz, timestamptz, text);
drop function if exists public.serie_diaria(text, timestamptz, timestamptz);
drop function if exists public.ranking(text, text, timestamptz, timestamptz, int);
drop function if exists public.desglose(text, text, timestamptz, timestamptz);
drop function if exists public.kpis_extra(text, timestamptz, timestamptz);
drop function if exists public.actividad_semana(text, timestamptz, timestamptz);
drop function if exists public.mapa_calor(text, timestamptz, timestamptz);
drop function if exists public.mapa_calor(text, timestamptz, timestamptz, text);

-- KPIs por operación
create or replace function public.kpis_por_operacion(desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(operacion text, euros numeric, gramos_oro numeric, gramos_plata numeric, gramos_total numeric, unidades bigint)
language sql stable as $$
  select operacion,
         coalesce(sum(pago_eur),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0),
         coalesce(sum(peso_g),0), count(*)
    from public.operaciones_unificadas
   where fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda)
   group by operacion;
$$;

create or replace function public.serie_mensual(p_operacion text, desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(mes date, euros numeric, gramos numeric, unidades bigint, gramos_oro numeric, gramos_plata numeric)
language sql stable as $$
  select date_trunc('month', fecha_operacion)::date, coalesce(sum(pago_eur),0), coalesce(sum(peso_g),0), count(*),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda)
   group by 1 order by 1;
$$;

create or replace function public.serie_diaria(p_operacion text, desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(dia date, euros numeric, unidades bigint)
language sql stable as $$
  select date_trunc('day', fecha_operacion)::date, coalesce(sum(pago_eur),0), count(*)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda)
   group by 1 order by 1;
$$;

create or replace function public.ranking(p_operacion text, p_dim text, desde timestamptz, hasta timestamptz, p_limit int default 10, p_tienda text default null)
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
       and (%L is null or tienda = %L)
     group by 1 order by abs(sum(pago_eur)) desc nulls last limit %s
  $q$, p_dim, p_operacion, p_operacion, desde, hasta, p_tienda, p_tienda, p_limit);
end;
$$;

create or replace function public.desglose(p_operacion text, p_dim text, desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(etiqueta text, euros numeric, unidades bigint, gramos_oro numeric, gramos_plata numeric, peso_total numeric)
language plpgsql stable as $$
begin
  if p_dim not in ('tienda','empleado','familia_prenda','plataforma','metodo_pago','tipo_operacion','quilate_prenda','origen_metal') then
    raise exception 'dimensión no permitida: %', p_dim;
  end if;
  return query execute format($q$
    select coalesce(nullif(trim(%I),''),'(sin dato)') as etiqueta,
           coalesce(sum(pago_eur),0), count(*),
           coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
           coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0),
           coalesce(sum(peso_g),0)
      from public.operaciones_unificadas
     where (%L = 'todas' or operacion = %L)
       and fecha_operacion >= %L and fecha_operacion < %L
       and (%L is null or tienda = %L)
     group by 1 order by abs(sum(pago_eur)) desc nulls last
  $q$, p_dim, p_operacion, p_operacion, desde, hasta, p_tienda, p_tienda);
end;
$$;

create or replace function public.actividad_semana(p_operacion text, desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(dow int, euros numeric, unidades bigint)
language sql stable as $$
  select extract(dow from fecha_operacion)::int, coalesce(sum(pago_eur),0), count(*)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda)
   group by 1 order by 1;
$$;

create or replace function public.kpis_extra(p_operacion text, desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(tiendas_activas bigint, empleados_activos bigint, peso_medio numeric, ticket_max numeric, euros_oro numeric, euros_plata numeric)
language sql stable as $$
  select count(distinct tienda), count(distinct empleado),
         coalesce(avg(peso_g) filter (where peso_g > 0),0),
         coalesce(max(abs(pago_eur)),0),
         coalesce(sum(pago_eur) filter (where public.metal_de(quilate_prenda)='oro'),0),
         coalesce(sum(pago_eur) filter (where public.metal_de(quilate_prenda)='plata'),0)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda);
$$;

create or replace function public.mapa_calor(p_operacion text, desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(tienda text, dow int, hora int, euros numeric, unidades bigint, gramos numeric, gramos_oro numeric, gramos_plata numeric)
language sql stable as $$
  select coalesce(nullif(trim(tienda), ''), '(sin dato)'),
         extract(dow  from (fecha_operacion at time zone 'Atlantic/Canary'))::int,
         extract(hour from (fecha_operacion at time zone 'Atlantic/Canary'))::int,
         coalesce(sum(pago_eur),0), count(*), coalesce(sum(peso_g),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0)
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda)
   group by 1, 2, 3;
$$;

-- Desglose de VARIAS dimensiones en una sola llamada (reduce ida y vuelta)
create or replace function public.desglose_multi(p_operacion text, p_dims text[], desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(dim text, etiqueta text, euros numeric, unidades bigint, gramos_oro numeric, gramos_plata numeric, peso_total numeric)
language plpgsql stable as $$
declare d text;
begin
  foreach d in array p_dims loop
    if d not in ('tienda','empleado','familia_prenda','plataforma','metodo_pago','tipo_operacion','quilate_prenda','origen_metal') then
      continue;
    end if;
    return query execute format($q$
      select %L::text, coalesce(nullif(trim(%I),''),'(sin dato)'),
             coalesce(sum(pago_eur),0), count(*),
             coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
             coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0),
             coalesce(sum(peso_g),0)
        from public.operaciones_unificadas
       where (%L = 'todas' or operacion = %L)
         and fecha_operacion >= %L and fecha_operacion < %L
         and (%L is null or tienda = %L)
       group by 2 order by abs(sum(pago_eur)) desc nulls last
    $q$, d, d, p_operacion, p_operacion, desde, hasta, p_tienda, p_tienda);
  end loop;
end;
$$;

-- Detalle de una celda del mapa de calor (top movimientos de ese día de semana × hora)
create or replace function public.detalle_celda(
  p_operacion text, p_dow int, p_hora int, desde timestamptz, hasta timestamptz, p_tienda text default null
)
returns table(fecha timestamptz, codigo text, descripcion text, familia text, empleado text, tienda text, peso numeric, importe numeric)
language sql stable as $$
  select fecha_operacion, codigo, descripcion_prenda, familia_prenda, empleado, tienda, peso_g, pago_eur
    from public.operaciones_unificadas
   where (p_operacion = 'todas' or operacion = p_operacion)
     and fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda)
     and extract(dow  from (fecha_operacion at time zone 'Atlantic/Canary'))::int = p_dow
     and extract(hour from (fecha_operacion at time zone 'Atlantic/Canary'))::int = p_hora
   order by abs(pago_eur) desc nulls last
   limit 50;
$$;

-- Lista de tiendas (para el selector)
create or replace function public.tiendas()
returns table(tienda text)
language sql stable as $$
  select distinct coalesce(nullif(trim(tienda),''),'(sin dato)')
    from public.operaciones_unificadas where tienda is not null order by 1;
$$;

create or replace function public.rango_fechas()
returns table(min_fecha timestamptz, max_fecha timestamptz)
language sql stable as $$
  select min(fecha_operacion), max(fecha_operacion) from public.operaciones_unificadas;
$$;

grant select on public.operaciones_unificadas to authenticated;
grant execute on function public.kpis_por_operacion(timestamptz,timestamptz,text) to authenticated;
grant execute on function public.serie_mensual(text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.serie_diaria(text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.ranking(text,text,timestamptz,timestamptz,int,text) to authenticated;
grant execute on function public.desglose(text,text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.desglose_multi(text,text[],timestamptz,timestamptz,text) to authenticated;
grant execute on function public.actividad_semana(text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.kpis_extra(text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.mapa_calor(text,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.detalle_celda(text,int,int,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.tiendas() to authenticated;
grant execute on function public.rango_fechas() to authenticated;
