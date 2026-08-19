-- Actualizacion aditiva para una instalacion existente del modulo PRECINTOS.
-- No elimina ni modifica registros existentes.

begin;

alter table public.precintos_asignaciones
  add column if not exists observaciones text,
  add column if not exists firma_empleado_atempi_url text,
  add column if not exists hora_final time,
  add column if not exists firma_empleado_colfrutas_url text;

commit;
