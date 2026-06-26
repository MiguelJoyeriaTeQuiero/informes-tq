-- ============================================================
--  Módulo Finanzas / Rentabilidad (card #26 "Productos Vendidos")
--  Coste, venta, base imponible y cuota IGIC por línea vendida.
--  Ejecutar DESPUÉS de schema.sql
-- ============================================================

create table if not exists public.ventas_rentabilidad (
  id              uuid primary key,
  fecha           timestamptz,
  codigo_venta    text,
  codigo_producto text,
  familia         text,
  metal           text,           -- 'oro' | 'plata' | 'otro'
  origen_metal    text,
  tienda          text,
  empleado        text,
  metodo_pago     text,
  coste           numeric,
  venta           numeric,
  total_recibido  numeric,
  devolucion      numeric,
  base_imponible  numeric,
  cuota_igic      numeric,
  igic_pct        numeric,
  descuento       numeric,
  cliente         text,
  synced_at       timestamptz not null default now()
);
create index if not exists idx_rent_fecha   on public.ventas_rentabilidad (fecha);
create index if not exists idx_rent_tienda   on public.ventas_rentabilidad (tienda);
create index if not exists idx_rent_familia  on public.ventas_rentabilidad (familia);

-- Resumen de rentabilidad en un rango
create or replace function public.rent_resumen(desde timestamptz, hasta timestamptz)
returns table(
  ingresos numeric, coste numeric, margen numeric, unidades bigint,
  base_imponible numeric, cuota_igic numeric, devoluciones numeric, descuentos numeric
) language sql stable as $$
  select coalesce(sum(venta),0),
         coalesce(sum(coste),0),
         coalesce(sum(venta) - sum(coste),0),
         count(*),
         coalesce(sum(base_imponible),0),
         coalesce(sum(cuota_igic),0),
         coalesce(sum(devolucion),0),
         coalesce(sum(descuento),0)
    from public.ventas_rentabilidad
   where fecha >= desde and fecha < hasta;
$$;

-- Serie mensual ingresos/coste/margen
create or replace function public.rent_serie(desde timestamptz, hasta timestamptz)
returns table(mes date, ingresos numeric, coste numeric, margen numeric)
language sql stable as $$
  select date_trunc('month', fecha)::date,
         coalesce(sum(venta),0), coalesce(sum(coste),0), coalesce(sum(venta)-sum(coste),0)
    from public.ventas_rentabilidad
   where fecha >= desde and fecha < hasta
   group by 1 order by 1;
$$;

-- Desglose de margen por dimensión
create or replace function public.rent_desglose(p_dim text, desde timestamptz, hasta timestamptz)
returns table(etiqueta text, ingresos numeric, coste numeric, margen numeric, unidades bigint)
language plpgsql stable as $$
begin
  if p_dim not in ('familia','metal','tienda','empleado','metodo_pago','origen_metal') then
    raise exception 'dimensión no permitida: %', p_dim;
  end if;
  return query execute format($q$
    select coalesce(nullif(trim(%I),''),'(sin dato)'),
           coalesce(sum(venta),0), coalesce(sum(coste),0), coalesce(sum(venta)-sum(coste),0), count(*)
      from public.ventas_rentabilidad
     where fecha >= %L and fecha < %L
     group by 1 order by (coalesce(sum(venta),0)-coalesce(sum(coste),0)) desc nulls last
  $q$, p_dim, desde, hasta);
end;
$$;

-- Desglose fiscal por tipo de IGIC
create or replace function public.rent_fiscal(desde timestamptz, hasta timestamptz)
returns table(igic_pct numeric, base_imponible numeric, cuota_igic numeric, total numeric, unidades bigint)
language sql stable as $$
  select coalesce(igic_pct,0),
         coalesce(sum(base_imponible),0), coalesce(sum(cuota_igic),0),
         coalesce(sum(base_imponible)+sum(cuota_igic),0), count(*)
    from public.ventas_rentabilidad
   where fecha >= desde and fecha < hasta
   group by 1 order by 1;
$$;

alter table public.ventas_rentabilidad enable row level security;
drop policy if exists "rent_read" on public.ventas_rentabilidad;
create policy "rent_read" on public.ventas_rentabilidad for select to authenticated using (true);

grant select on public.ventas_rentabilidad to authenticated;
grant execute on function public.rent_resumen(timestamptz,timestamptz) to authenticated;
grant execute on function public.rent_serie(timestamptz,timestamptz) to authenticated;
grant execute on function public.rent_desglose(text,timestamptz,timestamptz) to authenticated;
grant execute on function public.rent_fiscal(timestamptz,timestamptz) to authenticated;
