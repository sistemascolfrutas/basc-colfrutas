-- SOLO LECTURA. Ejecutar despues de la migracion, en Supabase SQL Editor.
-- No invoca las funciones que guardan datos ni requiere simular usuarios.

-- 1. Operaciones abiertas y elegibilidad de salida, sin limites del cliente HTTP.
select o.nombre_operacion, i.tipo_operacion, o.requiere_sellado,
  s.estado as supervision,
  case
    when o.estado_salida = 'completo' then 'REVISAR: estado completo sin F-SU-04'
    when i.tipo_operacion <> 'Transporte de acopio a puerto' then 'F-SU-04'
    when not exists (select 1 from public.reg_fsu02_inspeccion f where f.nombre_operacion=o.nombre_operacion) then 'F-SU-02'
    when not exists (select 1 from public.reg_fsu03_cargue_aseguramiento f where f.nombre_operacion=o.nombre_operacion) then 'F-SU-03'
    when o.requiere_sellado and s.estado is distinct from 'completo' then 'Supervision de sellado'
    else 'F-SU-04'
  end as siguiente_etapa
from public.operaciones_maestra o
join public.reg_fsu01_ingreso i using (nombre_operacion)
left join public.supervisiones_sellado s using (nombre_operacion)
where not exists (select 1 from public.reg_fsu04_salida f where f.nombre_operacion=o.nombre_operacion)
order by o.fecha desc, o.nombre_operacion desc;

-- 2. El cierre historico y las salidas existentes deben conservarse.
select count(*) as total_salidas,
  count(*) filter (where cierre_administrativo) as cierres_administrativos
from public.reg_fsu04_salida;

-- 3. Estados contradictorios. No corregirlos masivamente sin revisar cada caso.
select o.nombre_operacion, o.estado_salida, s.id as salida_id
from public.operaciones_maestra o
left join public.reg_fsu04_salida s using (nombre_operacion)
where (o.estado_salida = 'completo' and s.id is null)
   or (o.estado_salida is distinct from 'completo' and s.id is not null);

-- 4. La migracion debe haber creado estas funciones y los cinco triggers.
select routine_name from information_schema.routines
where routine_schema='public' and routine_name in (
  'listar_operaciones_pendientes', 'validar_etapa_operacion', 'sincronizar_salida_confirmada'
);
select event_object_table, trigger_name, event_manipulation
from information_schema.triggers
where trigger_schema='public'
and trigger_name in ('validar_etapa', 'sincronizar_salida_confirmada')
order by event_object_table, trigger_name, event_manipulation;

-- 5. Durante mantenimiento debe haber cero operaciones con sellado exigido.
select count(*) filter (where requiere_sellado) as operaciones_con_sellado_exigido
from public.operaciones_maestra;
select column_default, is_nullable from information_schema.columns
where table_schema='public' and table_name='operaciones_maestra' and column_name='requiere_sellado';
