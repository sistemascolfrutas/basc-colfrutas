-- Nuevo flujo de trazabilidad: un embarque tiene exactamente un kit.
-- Las tablas historicas precintos_asignaciones y precintos_salidas no se modifican.

begin;

-- Habilita el rol especifico para Auxiliar de Comercio en instalaciones existentes.
alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users add constraint app_users_role_check
  check (role in ('admin', 'comercio', 'porteria', 'logistica'));

create table if not exists public.precintos_embarques (
  id uuid primary key default gen_random_uuid(),
  numero_embarque text not null,
  numero_kit text not null,
  estado text not null default 'PENDIENTE_RECEPCION'
    check (estado in ('PENDIENTE_RECEPCION', 'DISPONIBLE_PORTERIA', 'DESPACHADO', 'ANULADO')),
  observaciones text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists precintos_embarques_numero_uq
  on public.precintos_embarques (upper(numero_embarque));
create unique index if not exists precintos_embarques_kit_uq
  on public.precintos_embarques (upper(numero_kit));

create table if not exists public.precintos_recepciones (
  id uuid primary key default gen_random_uuid(),
  embarque_id uuid not null unique references public.precintos_embarques(id),
  foto_url text not null,
  auxiliar_nombre text not null,
  auxiliar_cedula text not null,
  porteria_nombre text not null,
  porteria_cedula text not null,
  firma_auxiliar_url text not null,
  firma_porteria_url text not null,
  observaciones text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.precintos_despachos (
  id uuid primary key default gen_random_uuid(),
  embarque_id uuid not null unique references public.precintos_embarques(id),
  foto_url text not null,
  porteria_nombre text not null,
  porteria_cedula text not null,
  logistica_nombre text not null,
  logistica_cedula text not null,
  firma_porteria_url text not null,
  firma_logistica_url text not null,
  observaciones text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists precintos_embarques_estado_idx
  on public.precintos_embarques (estado, created_at desc);

create or replace function public.set_precintos_embarque_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists precintos_embarques_updated_at on public.precintos_embarques;
create trigger precintos_embarques_updated_at before update on public.precintos_embarques
for each row execute function public.set_precintos_embarque_updated_at();

-- El cambio de estado ocurre en la misma transaccion que el movimiento.
create or replace function public.confirmar_recepcion_kit(
  p_embarque_id uuid, p_movimiento jsonb
) returns public.precintos_recepciones language plpgsql security invoker as $$
declare resultado public.precintos_recepciones;
begin
  update public.precintos_embarques set estado = 'DISPONIBLE_PORTERIA'
  where id = p_embarque_id and estado = 'PENDIENTE_RECEPCION';
  if not found then raise exception 'El embarque ya no esta pendiente de recepcion'; end if;
  insert into public.precintos_recepciones (
    embarque_id, foto_url, auxiliar_nombre, auxiliar_cedula, porteria_nombre,
    porteria_cedula, firma_auxiliar_url, firma_porteria_url, observaciones, created_by
  ) values (
    p_embarque_id, p_movimiento->>'foto_url', p_movimiento->>'auxiliar_nombre',
    p_movimiento->>'auxiliar_cedula', p_movimiento->>'porteria_nombre',
    p_movimiento->>'porteria_cedula', p_movimiento->>'firma_auxiliar_url',
    p_movimiento->>'firma_porteria_url', nullif(p_movimiento->>'observaciones', ''),
    (p_movimiento->>'created_by')::uuid
  ) returning * into resultado;
  return resultado;
end;
$$;

create or replace function public.confirmar_despacho_kit(
  p_embarque_id uuid, p_movimiento jsonb
) returns public.precintos_despachos language plpgsql security invoker as $$
declare resultado public.precintos_despachos;
begin
  update public.precintos_embarques set estado = 'DESPACHADO'
  where id = p_embarque_id and estado = 'DISPONIBLE_PORTERIA';
  if not found then raise exception 'El kit no esta disponible en porteria'; end if;
  insert into public.precintos_despachos (
    embarque_id, foto_url, porteria_nombre, porteria_cedula, logistica_nombre,
    logistica_cedula, firma_porteria_url, firma_logistica_url, observaciones, created_by
  ) values (
    p_embarque_id, p_movimiento->>'foto_url', p_movimiento->>'porteria_nombre',
    p_movimiento->>'porteria_cedula', p_movimiento->>'logistica_nombre',
    p_movimiento->>'logistica_cedula', p_movimiento->>'firma_porteria_url',
    p_movimiento->>'firma_logistica_url', nullif(p_movimiento->>'observaciones', ''),
    (p_movimiento->>'created_by')::uuid
  ) returning * into resultado;
  return resultado;
end;
$$;

alter table public.precintos_embarques enable row level security;
alter table public.precintos_recepciones enable row level security;
alter table public.precintos_despachos enable row level security;

drop policy if exists "precintos_embarques_read" on public.precintos_embarques;
create policy "precintos_embarques_read" on public.precintos_embarques for select to authenticated using (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or permissions && array['embarques','precintos','salida_precintos','audit']::text[]))
);
drop policy if exists "precintos_embarques_insert" on public.precintos_embarques;
create policy "precintos_embarques_insert" on public.precintos_embarques for insert to authenticated with check (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or 'embarques' = any(permissions)))
);
drop policy if exists "precintos_embarques_update" on public.precintos_embarques;
create policy "precintos_embarques_update" on public.precintos_embarques for update to authenticated using (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or permissions && array['precintos','salida_precintos']::text[]))
);

drop policy if exists "precintos_recepciones_read" on public.precintos_recepciones;
create policy "precintos_recepciones_read" on public.precintos_recepciones for select to authenticated using (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or permissions && array['embarques','precintos','salida_precintos','audit']::text[]))
);
drop policy if exists "precintos_recepciones_insert" on public.precintos_recepciones;
create policy "precintos_recepciones_insert" on public.precintos_recepciones for insert to authenticated with check (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or 'precintos' = any(permissions)))
);
drop policy if exists "precintos_despachos_read" on public.precintos_despachos;
create policy "precintos_despachos_read" on public.precintos_despachos for select to authenticated using (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or permissions && array['embarques','salida_precintos','audit']::text[]))
);
drop policy if exists "precintos_despachos_insert" on public.precintos_despachos;
create policy "precintos_despachos_insert" on public.precintos_despachos for insert to authenticated with check (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or 'salida_precintos' = any(permissions)))
);

drop policy if exists "trazabilidad_kits_storage_read" on storage.objects;
create policy "trazabilidad_kits_storage_read" on storage.objects for select to authenticated using (
  bucket_id = 'evidencias-basc' and name like 'trazabilidad-kits/%'
);
drop policy if exists "trazabilidad_kits_storage_insert" on storage.objects;
create policy "trazabilidad_kits_storage_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'evidencias-basc' and name like 'trazabilidad-kits/%'
);

commit;
