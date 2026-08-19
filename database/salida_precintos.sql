-- SALIDA DE PRECINTO con formulario completo.
-- Compatible si anteriormente se creo la tabla con seleccion de ingresos.

begin;

create table if not exists public.precintos_salidas (
  id uuid primary key default gen_random_uuid(),
  fecha date,
  hora time,
  accion text not null default
    'Asignacion Kit de Seguridad de ATEMPI para custodia de COLFRUTAS Paletizado',
  empleado_colfrutas_id uuid references public.precintos_empleados(id),
  empleado_colfrutas_nombre text,
  empleado_colfrutas_cedula text,
  empleado_colfrutas_cargo text,
  empleado_atempi_id uuid references public.precintos_empleados(id),
  empleado_atempi_nombre text,
  empleado_atempi_cedula text,
  cantidad_kits smallint check (cantidad_kits between 1 and 4),
  kits jsonb,
  observaciones text,
  firma_empleado_atempi_url text,
  hora_final time,
  firma_empleado_colfrutas_url text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- Agrega los campos si existe la version anterior de la tabla.
alter table public.precintos_salidas
  add column if not exists fecha date,
  add column if not exists hora time,
  add column if not exists empleado_colfrutas_id uuid references public.precintos_empleados(id),
  add column if not exists empleado_colfrutas_nombre text,
  add column if not exists empleado_colfrutas_cedula text,
  add column if not exists empleado_colfrutas_cargo text,
  add column if not exists empleado_atempi_id uuid references public.precintos_empleados(id),
  add column if not exists empleado_atempi_nombre text,
  add column if not exists empleado_atempi_cedula text,
  add column if not exists cantidad_kits smallint,
  add column if not exists kits jsonb,
  add column if not exists observaciones text,
  add column if not exists firma_empleado_atempi_url text,
  add column if not exists hora_final time,
  add column if not exists firma_empleado_colfrutas_url text;

-- La salida ya no depende de seleccionar una entrada existente.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'precintos_salidas'
      and column_name = 'entrada_precinto_id'
  ) then
    alter table public.precintos_salidas
      alter column entrada_precinto_id drop not null;
  end if;
end $$;

drop index if exists public.precintos_salidas_fecha_idx;
create index if not exists precintos_salidas_fecha_idx
  on public.precintos_salidas (fecha desc, hora desc);

alter table public.precintos_salidas enable row level security;

drop policy if exists "precintos_salidas_read" on public.precintos_salidas;
create policy "precintos_salidas_read"
on public.precintos_salidas for select to authenticated
using (
  exists (
    select 1 from public.app_users
    where is_active = true
      and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
      and (role = 'admin' or permissions && array['precintos', 'audit']::text[])
  )
);

drop policy if exists "precintos_salidas_insert" on public.precintos_salidas;
create policy "precintos_salidas_insert"
on public.precintos_salidas for insert to authenticated
with check (
  exists (
    select 1 from public.app_users
    where is_active = true
      and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
      and (role = 'admin' or 'precintos' = any(permissions))
  )
);

drop policy if exists "salida_precintos_storage_select" on storage.objects;
create policy "salida_precintos_storage_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'evidencias-basc'
  and name like 'salida-precintos/%'
  and exists (
    select 1 from public.app_users
    where is_active = true
      and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
      and (role = 'admin' or permissions && array['precintos', 'audit']::text[])
  )
);

drop policy if exists "salida_precintos_storage_insert" on storage.objects;
create policy "salida_precintos_storage_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidencias-basc'
  and name like 'salida-precintos/%'
  and exists (
    select 1 from public.app_users
    where is_active = true
      and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
      and (role = 'admin' or 'precintos' = any(permissions))
  )
);

commit;
