-- Aplicar en Supabase antes de publicar el cambio de la aplicacion.
-- Permite registrar el mismo numero de embarque con otro kit.
-- Conserva los registros, sus movimientos y la unicidad del numero de kit.
begin;

drop index if exists public.precintos_embarques_numero_uq;
create index if not exists precintos_embarques_numero_idx
  on public.precintos_embarques (upper(numero_embarque));

commit;
