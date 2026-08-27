-- Permite registrar manualmente un empleado COLFRUTAS que no este en el catalogo.
-- Los datos escritos se conservan en las columnas de nombre, cedula y cargo.

begin;

alter table public.precintos_asignaciones
  alter column empleado_colfrutas_id drop not null;

alter table public.precintos_salidas
  alter column empleado_colfrutas_id drop not null;

commit;
