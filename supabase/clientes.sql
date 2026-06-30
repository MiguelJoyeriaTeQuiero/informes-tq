-- ============================================================
--  Analítica de clientes (sobre la tabla de reservas)
--  Ejecutar DESPUÉS de schema.sql. Requiere re-sincronizar Reservas
--  para poblar las columnas de consentimiento.
-- ============================================================

alter table public.reservas add column if not exists cliente_email_notif boolean;
alter table public.reservas add column if not exists cliente_sms_notif boolean;

create index if not exists idx_reservas_cliente on public.reservas (cliente_id);

-- Resumen de la base de clientes (todo el histórico)
create or replace function public.clientes_resumen()
returns table(total bigint, recurrentes bigint, ltv_medio numeric, ticket_medio numeric, con_email bigint)
language sql stable as $$
  with base as (
    select cliente_id, count(*) f, coalesce(sum(pago_eur),0) m,
           bool_or(cliente_email like '%@%') tiene_email
      from public.reservas where cliente_id is not null and trim(cliente_id) <> ''
      group by cliente_id
  )
  select count(*), count(*) filter (where f > 1),
         coalesce(avg(m),0), coalesce(avg(m / nullif(f,0)),0),
         count(*) filter (where tiene_email)
    from base;
$$;

-- Segmentación RFM
create or replace function public.clientes_rfm()
returns table(segmento text, clientes bigint, monetario numeric)
language sql stable as $$
  with base as (
    select cliente_id, max(fecha_operacion) ult, count(*) f, coalesce(sum(pago_eur),0) m
      from public.reservas where cliente_id is not null and trim(cliente_id) <> ''
      group by cliente_id
  ),
  scored as (
    select *,
      ntile(5) over (order by ult asc) r,   -- 5 = más reciente
      ntile(5) over (order by f asc)   fs,
      ntile(5) over (order by m asc)   ms
    from base
  ),
  seg as (
    select m,
      case
        when r >= 4 and fs >= 4 then 'Campeones'
        when r >= 3 and fs >= 3 then 'Leales'
        when r >= 4 and fs <= 2 then 'Nuevos / Prometedores'
        when r <= 2 and fs >= 3 then 'En riesgo'
        when r <= 2 and fs <= 2 then 'Hibernando'
        else 'Ocasionales'
      end as segmento
    from scored
  )
  select segmento, count(*), coalesce(sum(m),0) from seg group by segmento order by 2 desc;
$$;

-- Top clientes por valor (LTV)
create or replace function public.clientes_top(p_limit int default 20)
returns table(cliente text, provincia text, frecuencia bigint, monetario numeric, ultima timestamptz)
language sql stable as $$
  select coalesce(max(cliente_nombre),'(sin nombre)'),
         coalesce(max(cliente_provincia),'—'),
         count(*), coalesce(sum(pago_eur),0), max(fecha_operacion)
    from public.reservas where cliente_id is not null and trim(cliente_id) <> ''
    group by cliente_id order by 4 desc nulls last limit p_limit;
$$;

-- Distribución geográfica por provincia
create or replace function public.clientes_geo()
returns table(provincia text, clientes bigint, importe numeric)
language sql stable as $$
  select coalesce(nullif(trim(cliente_provincia),''),'(sin dato)'),
         count(distinct cliente_id), coalesce(sum(pago_eur),0)
    from public.reservas where cliente_id is not null and trim(cliente_id) <> ''
    group by 1 order by 2 desc;
$$;

-- Lista de clientes con email (para marketing, con consentimiento)
create or replace function public.clientes_email_list(p_limit int default 5000)
returns table(
  cliente text, email text, telefono text, provincia text,
  email_notif boolean, sms_notif boolean, ultima timestamptz, operaciones bigint, importe numeric
) language sql stable as $$
  select coalesce(max(cliente_nombre),''), max(cliente_email), max(cliente_telefono),
         max(cliente_provincia), bool_or(cliente_email_notif), bool_or(cliente_sms_notif),
         max(fecha_operacion), count(*), coalesce(sum(pago_eur),0)
    from public.reservas
   where cliente_id is not null and trim(cliente_id) <> ''
     and cliente_email like '%@%'
   group by cliente_id order by 9 desc limit p_limit;
$$;

grant execute on function public.clientes_resumen() to authenticated;
grant execute on function public.clientes_email_list(int) to authenticated;
grant execute on function public.clientes_rfm() to authenticated;
grant execute on function public.clientes_top(int) to authenticated;
grant execute on function public.clientes_geo() to authenticated;
