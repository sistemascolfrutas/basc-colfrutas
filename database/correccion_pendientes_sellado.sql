-- Ejecutar ANTES de desplegar el codigo nuevo. No se ha ejecutado desde Codex.
-- Sellado EN MANTENIMIENTO: no se exige en operaciones existentes ni nuevas.
-- No requiere configurar fechas ni modifica formularios o evidencias historicas.
begin;

alter table public.operaciones_maestra
  add column if not exists requiere_sellado boolean;

update public.operaciones_maestra
set requiere_sellado = false
where requiere_sellado is distinct from false;

alter table public.operaciones_maestra
  alter column requiere_sellado set default false,
  alter column requiere_sellado set not null;

-- SECURITY DEFINER permite comprobar etapas de otros roles, sin darles lectura
-- directa a sus tablas. Solo devuelve datos operativos al permiso solicitado.
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
        and o.requiere_sellado
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

-- Guardas en la base: una lista abierta en otro navegador no permite continuar
-- una operacion ya cerrada ni sobrescribir su salida.
create or replace function public.validar_etapa_operacion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  op public.operaciones_maestra;
  tipo text;
begin
  if TG_OP = 'UPDATE' and new.nombre_operacion is distinct from old.nombre_operacion then
    raise exception 'No se puede cambiar la operacion de un formulario guardado';
  end if;
  select * into op from public.operaciones_maestra
  where nombre_operacion = new.nombre_operacion for update;
  if not found then raise exception 'La operacion no existe'; end if;
  if op.estado_salida = 'completo' or exists (
    select 1 from public.reg_fsu04_salida s where s.nombre_operacion = new.nombre_operacion
  ) then raise exception 'La operacion ya tiene salida o cierre administrativo. Actualiza la lista de pendientes'; end if;

  select i.tipo_operacion into tipo from public.reg_fsu01_ingreso i
  where i.nombre_operacion = new.nombre_operacion;
  if not found then raise exception 'Falta registrar F-SU-01'; end if;

  if TG_TABLE_NAME = 'reg_fsu04_salida' then
    if new.cierre_administrativo then
      if coalesce(auth.role(),'') <> 'service_role' then
        raise exception 'El cierre administrativo requiere el servicio autorizado';
      end if;
      return new;
    end if;
    if upper(regexp_replace(new.placa_numero_contenedor, '\s', '', 'g')) <> upper(regexp_replace(op.placa, '\s', '', 'g')) then
      raise exception 'La placa de salida no coincide con la operacion seleccionada';
    end if;
  elsif tipo <> 'Transporte de acopio a puerto' then
    raise exception 'Esta operacion solo requiere ingreso y salida';
  end if;

  if tipo = 'Transporte de acopio a puerto' then
    if TG_TABLE_NAME <> 'reg_fsu02_inspeccion' and not exists (
      select 1 from public.reg_fsu02_inspeccion f where f.nombre_operacion = new.nombre_operacion
    ) then raise exception 'Falta completar F-SU-02'; end if;
    if TG_TABLE_NAME in ('reg_fsu04_salida', 'supervisiones_sellado') then
      if not exists (select 1 from public.reg_fsu03_cargue_aseguramiento f where f.nombre_operacion = new.nombre_operacion)
        then raise exception 'Falta completar F-SU-03'; end if;
      if TG_TABLE_NAME = 'reg_fsu04_salida' and op.requiere_sellado and not exists (
        select 1 from public.supervisiones_sellado s where s.nombre_operacion = new.nombre_operacion and s.estado = 'completo'
      ) then raise exception 'Falta finalizar la supervision de sellado'; end if;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validar_etapa_operacion() from public;
drop trigger if exists validar_etapa on public.reg_fsu02_inspeccion;
create trigger validar_etapa before insert or update on public.reg_fsu02_inspeccion
for each row execute function public.validar_etapa_operacion();
drop trigger if exists validar_etapa on public.reg_fsu03_cargue_aseguramiento;
create trigger validar_etapa before insert or update on public.reg_fsu03_cargue_aseguramiento
for each row execute function public.validar_etapa_operacion();
drop trigger if exists validar_etapa on public.reg_fsu04_salida;
create trigger validar_etapa before insert or update on public.reg_fsu04_salida
for each row execute function public.validar_etapa_operacion();
drop trigger if exists validar_etapa on public.supervisiones_sellado;
create trigger validar_etapa before insert or update on public.supervisiones_sellado
for each row execute function public.validar_etapa_operacion();

-- El registro de salida y su estado se confirman en la misma transaccion.
create or replace function public.sincronizar_salida_confirmada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.operaciones_maestra set estado_salida = 'completo'
  where nombre_operacion = new.nombre_operacion;
  return new;
end;
$$;
revoke all on function public.sincronizar_salida_confirmada() from public;
drop trigger if exists sincronizar_salida_confirmada on public.reg_fsu04_salida;
create trigger sincronizar_salida_confirmada after insert on public.reg_fsu04_salida
for each row execute function public.sincronizar_salida_confirmada();

commit;
