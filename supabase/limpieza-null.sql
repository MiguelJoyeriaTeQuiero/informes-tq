-- ============================================================
--  Limpieza: convierte el texto "null"/"undefined"/"" en NULL real
--  (causado por un bug antiguo de la transformación). Ejecutar una vez.
-- ============================================================
do $$
declare r record;
begin
  for r in
    select table_name, column_name
      from information_schema.columns
     where table_schema = 'public'
       and data_type in ('text', 'character varying')
       and table_name in ('ventas','compras','reservas','recuperables','trabajos','stock','ventas_rentabilidad')
  loop
    execute format(
      'update public.%I set %I = null where lower(trim(%I)) in (''null'',''undefined'','''')',
      r.table_name, r.column_name, r.column_name
    );
  end loop;
end $$;
