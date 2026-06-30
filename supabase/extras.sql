-- ============================================================
--  Tesorería + Bono variable  (ejecutar DESPUÉS de functions.sql)
-- ============================================================

-- Tesorería: entradas / salidas / neto por mes (el signo de pago_eur ya
-- codifica el flujo: ventas/reservas/trabajos +, compras/recuperables -).
create or replace function public.tesoreria(desde timestamptz, hasta timestamptz, p_tienda text default null)
returns table(mes date, entradas numeric, salidas numeric, neto numeric)
language sql stable as $$
  select date_trunc('month', fecha_operacion)::date,
         coalesce(sum(pago_eur) filter (where pago_eur > 0), 0),
         coalesce(sum(pago_eur) filter (where pago_eur < 0), 0),
         coalesce(sum(pago_eur), 0)
    from public.operaciones_unificadas
   where fecha_operacion >= desde and fecha_operacion < hasta
     and (p_tienda is null or tienda = p_tienda)
   group by 1 order by 1;
$$;

-- Base del bono: gramos de oro/plata vendidos por tienda (nuevo vs ocasión)
create or replace function public.bono_base(desde timestamptz, hasta timestamptz)
returns table(
  tienda text, oro_g numeric, plata_g numeric,
  oro_nuevo_g numeric, oro_ocasion_g numeric, importe numeric, unidades bigint
) language sql stable as $$
  select coalesce(nullif(trim(tienda),''),'(sin dato)'),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro'),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='plata'),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro' and lower(coalesce(origen_metal,'')) like '%nuevo%'),0),
         coalesce(sum(peso_g) filter (where public.metal_de(quilate_prenda)='oro' and lower(coalesce(origen_metal,'')) like '%casi%'),0),
         coalesce(sum(pago_eur),0), count(*)
    from public.operaciones_unificadas
   where operacion = 'ventas' and fecha_operacion >= desde and fecha_operacion < hasta
   group by 1 order by 2 desc nulls last;
$$;

-- Configuración del bono (tarifa €/gramo). Fila única.
create table if not exists public.bono_config (
  id          integer primary key default 1,
  eur_g_oro   numeric not null default 0,
  eur_g_plata numeric not null default 0,
  updated_at  timestamptz not null default now()
);
insert into public.bono_config (id, eur_g_oro, eur_g_plata) values (1, 0, 0) on conflict (id) do nothing;

alter table public.bono_config enable row level security;
drop policy if exists "bono_config_read" on public.bono_config;
create policy "bono_config_read" on public.bono_config for select to authenticated using (true);

grant select on public.bono_config to authenticated;
grant execute on function public.tesoreria(timestamptz,timestamptz,text) to authenticated;
grant execute on function public.bono_base(timestamptz,timestamptz) to authenticated;
