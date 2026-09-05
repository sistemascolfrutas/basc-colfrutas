-- Aplicar despues de correccion_pendientes_sellado.sql y antes del nuevo despliegue.
-- Permite usar y retomar sellados opcionales; NO activa requiere_sellado.
begin;
create or replace function public.listar_operaciones_pendientes(
  p_form text, p_offset integer default 0, p_limit integer default 100
) returns table(datos jsonb)
language plpgsql stable security definer
set search_path = public
as $$
begin
  if p_form is null or p_form not in ('fsu02','fsu03','fsu04','supervision_sellado') then
    raise exception 'Formulario no valido';
  end if;
  if not exists (
    select 1 from public.app_users u
    where u.is_active and (
      u.auth_user_id = auth.uid()
      or u.email = lower(coalesce(auth.jwt()->>'email',''))
    ) and (u.role = 'admin' or p_form = any(u.permissions))
  ) then
    raise exception 'Sin permiso para consultar este formulario' using errcode = '42501';
  end if;

  return query
  select jsonb_build_object(
    'id', o.id, 'nombre_operacion', o.nombre_operacion,
    'placa', o.placa, 'fecha', o.fecha, 'conductor', o.conductor,
    'empresa_transportadora', o.empresa_transportadora,
    'estado_ingreso', o.estado_ingreso, 'estado_inspeccion', o.estado_inspeccion,
    'estado_cargue', o.estado_cargue, 'estado_salida', o.estado_salida,
    'estado_sellado', o.estado_sellado, 'requiere_sellado', o.requiere_sellado,
    'ruta_evidencias_folder', o.ruta_evidencias_folder,
    'tipo_operacion', i.tipo_operacion
  )
  from public.operaciones_maestra o
  join public.reg_fsu01_ingreso i using (nombre_operacion)
  where o.estado_salida is distinct from 'completo'
    and not exists (
      select 1 from public.reg_fsu04_salida s where s.nombre_operacion = o.nombre_operacion
    )
    and case p_form
      when 'fsu02' then
        i.tipo_operacion = 'Transporte de acopio a puerto'
        and not exists (select 1 from public.reg_fsu02_inspeccion f where f.nombre_operacion = o.nombre_operacion)
      when 'fsu03' then
        i.tipo_operacion = 'Transporte de acopio a puerto'
        and exists (select 1 from public.reg_fsu02_inspeccion f where f.nombre_operacion = o.nombre_operacion)
        and not exists (select 1 from public.reg_fsu03_cargue_aseguramiento f where f.nombre_operacion = o.nombre_operacion)
      when 'supervision_sellado' then
        i.tipo_operacion = 'Transporte de acopio a puerto'
        and exists (select 1 from public.reg_fsu02_inspeccion f where f.nombre_operacion = o.nombre_operacion)
        and exists (select 1 from public.reg_fsu03_cargue_aseguramiento f where f.nombre_operacion = o.nombre_operacion)
        and not exists (select 1 from public.supervisiones_sellado s where s.nombre_operacion = o.nombre_operacion and s.estado = 'completo')
      when 'fsu04' then
        i.tipo_operacion in ('Transporte de materiales a productor', 'Transporte de fruta a centro de acopio', 'Otro')
        or (
          i.tipo_operacion = 'Transporte de acopio a puerto'
          and exists (select 1 from public.reg_fsu02_inspeccion f where f.nombre_operacion = o.nombre_operacion)
          and exists (select 1 from public.reg_fsu03_cargue_aseguramiento f where f.nombre_operacion = o.nombre_operacion)
          and (not o.requiere_sellado or exists (
            select 1 from public.supervisiones_sellado s
            where s.nombre_operacion = o.nombre_operacion and s.estado = 'completo'
          ))
        )
    end
  order by o.fecha desc, o.nombre_operacion desc
  limit least(greatest(coalesce(p_limit,100),1),100)
  offset greatest(coalesce(p_offset,0),0);
end;
$$;

revoke all on function public.listar_operaciones_pendientes(text,integer,integer) from public, anon;
grant execute on function public.listar_operaciones_pendientes(text,integer,integer) to authenticated;

-- Los eventos guardados son inmutables, incluidos los STAND BY existentes.
create or replace function public.proteger_evento_sellado_guardado()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Los datos, fotos y firmas de un sellado guardado no se pueden modificar ni eliminar';
end;
$$;
revoke all on function public.proteger_evento_sellado_guardado() from public;
drop trigger if exists proteger_evento_sellado_guardado on public.supervision_sellado_eventos;
create trigger proteger_evento_sellado_guardado
before update or delete on public.supervision_sellado_eventos
for each row execute function public.proteger_evento_sellado_guardado();

create or replace function public.proteger_identidad_supervision()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.nombre_operacion is distinct from old.nombre_operacion
    or new.numero_embarque is distinct from old.numero_embarque
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'La operacion y el embarque del sellado guardado no se pueden cambiar';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_identidad_supervision() from public;
drop trigger if exists proteger_identidad_supervision on public.supervisiones_sellado;
create trigger proteger_identidad_supervision before update on public.supervisiones_sellado
for each row execute function public.proteger_identidad_supervision();

-- Una politica permisiva de otro modulo no permite reemplazar estas evidencias.
-- No cambia las politicas de insercion ni lectura; las fotos nuevas se guardan en otra ruta.
drop policy if exists sellado_evidencias_no_reemplazar on storage.objects;
create policy sellado_evidencias_no_reemplazar on storage.objects
as restrictive for update to authenticated
using (name not like 'supervision-sellado/%')
with check (name not like 'supervision-sellado/%');
drop policy if exists sellado_evidencias_no_borrar on storage.objects;
create policy sellado_evidencias_no_borrar on storage.objects
as restrictive for delete to authenticated
using (name not like 'supervision-sellado/%');

commit;