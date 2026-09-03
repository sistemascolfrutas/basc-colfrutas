-- Módulo Supervisión de sellado. Ejecutar una vez en Supabase SQL Editor.
begin;

alter table public.operaciones_maestra
  add column if not exists estado_sellado text not null default 'pendiente'
  check (estado_sellado in ('pendiente', 'stand_by', 'completo'));

create table if not exists public.supervisiones_sellado (
  id uuid primary key default gen_random_uuid(),
  nombre_operacion text not null unique references public.operaciones_maestra(nombre_operacion) on delete cascade,
  numero_embarque text not null,
  estado text not null default 'stand_by' check (estado in ('stand_by', 'completo')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.supervision_sellado_eventos (
  id uuid primary key,
  supervision_id uuid not null references public.supervisiones_sellado(id) on delete cascade,
  tipo_evento text not null check (tipo_evento in ('stand_by', 'definitivo')),
  precintos jsonb not null check (jsonb_typeof(precintos) = 'array' and jsonb_array_length(precintos) between 1 and 5),
  instalador_id uuid references public.precintos_empleados(id),
  instalador_nombre text not null,
  instalador_cedula text not null,
  supervisor_id uuid references public.precintos_empleados(id),
  supervisor_nombre text not null,
  supervisor_cedula text not null,
  firma_instalador_url text not null,
  firma_supervisor_url text not null,
  observaciones text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists supervisiones_sellado_estado_idx on public.supervisiones_sellado(estado, updated_at desc);
create index if not exists supervision_sellado_eventos_supervision_idx on public.supervision_sellado_eventos(supervision_id, created_at);

create or replace function public.guardar_evento_supervision_sellado(
  p_nombre_operacion text, p_numero_embarque text, p_tipo_evento text,
  p_evento_id uuid, p_precintos jsonb, p_personas jsonb, p_firmas jsonb,
  p_observaciones text, p_created_by uuid
) returns public.supervisiones_sellado
language plpgsql security invoker as $$
declare resultado public.supervisiones_sellado;
begin
  if p_tipo_evento not in ('stand_by', 'definitivo') then raise exception 'Tipo de evento inválido'; end if;
  if not exists (select 1 from public.operaciones_maestra where nombre_operacion = p_nombre_operacion and estado_cargue = 'completo') then
    raise exception 'La operación no tiene el F-SU-03 completo';
  end if;
  insert into public.supervisiones_sellado(nombre_operacion, numero_embarque, estado, created_by, completed_at)
  values (p_nombre_operacion, upper(trim(p_numero_embarque)), case when p_tipo_evento = 'definitivo' then 'completo' else 'stand_by' end, p_created_by, case when p_tipo_evento = 'definitivo' then now() else null end)
  on conflict (nombre_operacion) do update set
    estado = case when p_tipo_evento = 'definitivo' then 'completo' else 'stand_by' end,
    completed_at = case when p_tipo_evento = 'definitivo' then now() else supervisiones_sellado.completed_at end,
    updated_at = now()
  where supervisiones_sellado.estado <> 'completo'
  returning * into resultado;
  if resultado.id is null then raise exception 'La supervisión ya fue finalizada'; end if;

  if exists (
    select 1 from public.supervision_sellado_eventos e,
    jsonb_array_elements(e.precintos) previo,
    jsonb_array_elements(p_precintos) nuevo
    where e.supervision_id = resultado.id and upper(previo->>'numero') = upper(nuevo->>'numero')
  ) then raise exception 'Uno de los números de precinto ya fue registrado en esta operación'; end if;

  insert into public.supervision_sellado_eventos(id, supervision_id, tipo_evento, precintos,
    instalador_id, instalador_nombre, instalador_cedula, supervisor_id, supervisor_nombre,
    supervisor_cedula, firma_instalador_url, firma_supervisor_url, observaciones, created_by)
  values (p_evento_id, resultado.id, p_tipo_evento, p_precintos,
    nullif(p_personas->>'instalador_id','')::uuid, p_personas->>'instalador_nombre', p_personas->>'instalador_cedula',
    nullif(p_personas->>'supervisor_id','')::uuid, p_personas->>'supervisor_nombre', p_personas->>'supervisor_cedula',
    p_firmas->>'instalador', p_firmas->>'supervisor', nullif(trim(p_observaciones),''), p_created_by);

  update public.operaciones_maestra set estado_sellado = case when p_tipo_evento = 'definitivo' then 'completo' else 'stand_by' end
  where nombre_operacion = p_nombre_operacion;
  return resultado;
end;
$$;

alter table public.supervisiones_sellado enable row level security;
alter table public.supervision_sellado_eventos enable row level security;

drop policy if exists "supervisiones_sellado_read" on public.supervisiones_sellado;
create policy "supervisiones_sellado_read" on public.supervisiones_sellado for select to authenticated using (
  exists(select 1 from public.app_users where is_active and (auth.uid()=auth_user_id or lower(coalesce(auth.jwt()->>'email',''))=email)
    and (role='admin' or permissions && array['supervision_sellado','fsu04','audit']::text[]))
);
drop policy if exists "supervisiones_sellado_write" on public.supervisiones_sellado;
create policy "supervisiones_sellado_write" on public.supervisiones_sellado for all to authenticated using (
  exists(select 1 from public.app_users where is_active and (auth.uid()=auth_user_id or lower(coalesce(auth.jwt()->>'email',''))=email)
    and (role='admin' or 'supervision_sellado'=any(permissions)))
) with check (
  exists(select 1 from public.app_users where is_active and (auth.uid()=auth_user_id or lower(coalesce(auth.jwt()->>'email',''))=email)
    and (role='admin' or 'supervision_sellado'=any(permissions)))
);
drop policy if exists "supervision_sellado_eventos_read" on public.supervision_sellado_eventos;
create policy "supervision_sellado_eventos_read" on public.supervision_sellado_eventos for select to authenticated using (
  exists(select 1 from public.app_users where is_active and (auth.uid()=auth_user_id or lower(coalesce(auth.jwt()->>'email',''))=email)
    and (role='admin' or permissions && array['supervision_sellado','fsu04','audit']::text[]))
);
drop policy if exists "supervision_sellado_eventos_insert" on public.supervision_sellado_eventos;
create policy "supervision_sellado_eventos_insert" on public.supervision_sellado_eventos for insert to authenticated with check (
  exists(select 1 from public.app_users where is_active and (auth.uid()=auth_user_id or lower(coalesce(auth.jwt()->>'email',''))=email)
    and (role='admin' or 'supervision_sellado'=any(permissions)))
);

drop policy if exists "supervision_sellado_storage_read" on storage.objects;
create policy "supervision_sellado_storage_read" on storage.objects for select to authenticated using (
  bucket_id='evidencias-basc' and name like 'supervision-sellado/%'
);
drop policy if exists "supervision_sellado_storage_insert" on storage.objects;
create policy "supervision_sellado_storage_insert" on storage.objects for insert to authenticated with check (
  bucket_id='evidencias-basc' and name like 'supervision-sellado/%'
);

commit;
