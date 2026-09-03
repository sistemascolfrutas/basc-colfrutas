-- Permite cerrar excepcionalmente un F-SU-04 omitido. Ejecutar una vez en Supabase.
begin;

alter table public.reg_fsu04_salida
  alter column foto_final_unidad_salida_url drop not null,
  add column if not exists cierre_administrativo boolean not null default false,
  add column if not exists cerrado_por uuid,
  add column if not exists cerrado_en timestamptz;

create or replace function public.cerrar_salida_administrativamente(
  p_nombre_operacion text,
  p_admin_id uuid
) returns public.reg_fsu04_salida
language plpgsql
security definer
set search_path = public
as $$
declare
  op public.operaciones_maestra;
  resultado public.reg_fsu04_salida;
begin
  select * into op from public.operaciones_maestra
  where nombre_operacion = p_nombre_operacion for update;
  if not found then raise exception 'La operación no existe'; end if;
  if op.estado_ingreso <> 'completo' then raise exception 'La operación no tiene un ingreso completo'; end if;
  if op.estado_salida = 'completo' or exists (
    select 1 from public.reg_fsu04_salida where nombre_operacion = p_nombre_operacion
  ) then raise exception 'La operación ya tiene una salida registrada'; end if;

  insert into public.reg_fsu04_salida (
    nombre_operacion, fecha_hora_salida, placa_numero_contenedor,
    puertas_cerradas_sellos_instalados, precinto_seguridad, observaciones,
    foto_final_unidad_salida_url, cierre_administrativo, cerrado_por, cerrado_en
  ) values (
    p_nombre_operacion, to_char(now() at time zone 'America/Bogota', 'YYYY-MM-DD"T"HH24:MI:SS'),
    op.placa, 'No aplica', null,
    'Cierre administrativo: no se diligenció el registro de salida correspondiente en el momento de la salida del vehículo.',
    null, true, p_admin_id, now()
  ) returning * into resultado;

  update public.operaciones_maestra set estado_salida = 'completo'
  where nombre_operacion = p_nombre_operacion;
  return resultado;
end;
$$;

revoke all on function public.cerrar_salida_administrativamente(text, uuid) from public;
revoke all on function public.cerrar_salida_administrativamente(text, uuid) from authenticated;
grant execute on function public.cerrar_salida_administrativamente(text, uuid) to service_role;

commit;
