-- Amplia de 4 a 10 la cantidad de kits/fotografias por registro.
-- No elimina ni modifica registros existentes.

begin;

alter table public.precintos_asignaciones
  drop constraint if exists precintos_asignaciones_cantidad_kits_check,
  drop constraint if exists precintos_asignaciones_kits_check;

alter table public.precintos_asignaciones
  add constraint precintos_asignaciones_cantidad_kits_check
    check (cantidad_kits between 1 and 10),
  add constraint precintos_asignaciones_kits_check
    check (
      jsonb_typeof(kits) = 'array'
      and jsonb_array_length(kits) between 1 and 10
    );

alter table public.precintos_salidas
  drop constraint if exists precintos_salidas_cantidad_kits_check;

alter table public.precintos_salidas
  add constraint precintos_salidas_cantidad_kits_check
    check (cantidad_kits between 1 and 10);

commit;
