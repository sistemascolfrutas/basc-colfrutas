-- Aplicar antes de desplegar el boton Eliminar. No elimina registros existentes.
begin;
alter table public.precintos_embarques
  add column if not exists eliminado_en timestamptz,
  add column if not exists eliminado_por uuid,
  add column if not exists motivo_eliminacion text;

create or replace function public.validar_eliminacion_embarque()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'UPDATE' then
    if old.eliminado_en is not null then
      raise exception 'El embarque fue eliminado y su historial no puede modificarse';
    end if;
  end if;
  if new.eliminado_en is not null or new.eliminado_por is not null or new.motivo_eliminacion is not null then
    if not exists (
      select 1 from public.app_users u where u.is_active and u.role='admin'
      and (u.auth_user_id=auth.uid() or u.email=lower(coalesce(auth.jwt()->>'email','')))
    ) then raise exception 'Solo el administrador puede eliminar embarques' using errcode='42501'; end if;
    if new.eliminado_en is null or new.eliminado_por is distinct from auth.uid()
      or auth.uid() is null or new.estado <> 'ANULADO'
      or nullif(trim(new.motivo_eliminacion),'') is null
      or length(new.motivo_eliminacion)>2000 then
      raise exception 'La eliminacion requiere motivo, fecha y administrador responsable';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validar_eliminacion_embarque() from public;
drop trigger if exists validar_eliminacion_embarque on public.precintos_embarques;
create trigger validar_eliminacion_embarque before insert or update on public.precintos_embarques
for each row execute function public.validar_eliminacion_embarque();

create or replace function public.eliminar_embarque_con_motivo(p_embarque_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare embarque public.precintos_embarques;
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_users u where u.is_active and u.role='admin'
    and (u.auth_user_id=auth.uid() or u.email=lower(coalesce(auth.jwt()->>'email','')))
  ) then raise exception 'Solo el administrador puede eliminar embarques' using errcode='42501'; end if;
  if nullif(trim(p_motivo),'') is null or length(trim(p_motivo))>2000 then
    raise exception 'Escribe un motivo de entre 1 y 2000 caracteres';
  end if;
  select * into embarque from public.precintos_embarques where id=p_embarque_id for update;
  if not found then raise exception 'El embarque no existe'; end if;
  if embarque.eliminado_en is not null then raise exception 'El embarque ya fue eliminado'; end if;
  update public.precintos_embarques
  set estado='ANULADO', eliminado_en=now(), eliminado_por=auth.uid(), motivo_eliminacion=trim(p_motivo)
  where id=p_embarque_id;
end;
$$;
revoke all on function public.eliminar_embarque_con_motivo(uuid,text) from public, anon;
grant execute on function public.eliminar_embarque_con_motivo(uuid,text) to authenticated;
commit;
