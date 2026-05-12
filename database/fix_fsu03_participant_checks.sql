-- Ejecutar en Supabase SQL Editor, en el proyecto que usa Vercel.
-- Quita las restricciones antiguas que obligan participante_1, participante_2
-- y participante_3 a pertenecer a una lista fija. El catalogo activo ahora se
-- valida desde public.fsu03_participants en la aplicacion.

alter table public.reg_fsu03_cargue_aseguramiento
  drop constraint if exists reg_fsu03_cargue_aseguramiento_participante_1_check,
  drop constraint if exists reg_fsu03_cargue_aseguramiento_participante_2_check,
  drop constraint if exists reg_fsu03_cargue_aseguramiento_participante_3_check;

-- Refuerzo: si Supabase/Postgres creo las restricciones con otro nombre,
-- este bloque elimina cualquier CHECK de esa tabla que mencione participantes.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select
      conname,
      pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conrelid = 'public.reg_fsu03_cargue_aseguramiento'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%participante_1%'
        or pg_get_constraintdef(oid) ilike '%participante_2%'
        or pg_get_constraintdef(oid) ilike '%participante_3%'
      )
  loop
    execute format(
      'alter table public.reg_fsu03_cargue_aseguramiento drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

-- Verificacion: esta consulta no debe devolver filas con participante_1,
-- participante_2 o participante_3. Si devuelve filas, copia el resultado.
select
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.reg_fsu03_cargue_aseguramiento'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) ilike '%participante%';
