-- Ejecutar en Supabase SQL Editor antes de usar el modulo PRECINTOS.

create table if not exists public.precintos_empleados (
  id uuid primary key default gen_random_uuid(),
  empresa text not null check (empresa in ('COLFRUTAS', 'ATEMPI')),
  nombre text not null,
  cedula text not null,
  cargo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa, cedula)
);

create table if not exists public.precintos_asignaciones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  hora time not null default localtime,
  accion text not null default 'Asignacion de Kit Seguridad por parte de COLFRUTAS',
  empleado_colfrutas_id uuid not null references public.precintos_empleados(id),
  empleado_colfrutas_nombre text not null,
  empleado_colfrutas_cedula text not null,
  empleado_colfrutas_cargo text not null,
  empleado_atempi_id uuid not null references public.precintos_empleados(id),
  empleado_atempi_nombre text not null,
  empleado_atempi_cedula text not null,
  cantidad_kits smallint not null check (cantidad_kits between 1 and 4),
  kits jsonb not null check (jsonb_typeof(kits) = 'array' and jsonb_array_length(kits) between 1 and 4),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists precintos_asignaciones_fecha_idx
  on public.precintos_asignaciones (fecha desc, hora desc);

alter table public.precintos_empleados enable row level security;
alter table public.precintos_asignaciones enable row level security;

drop policy if exists "precintos_empleados_read" on public.precintos_empleados;
create policy "precintos_empleados_read" on public.precintos_empleados
for select to authenticated using (
  exists (select 1 from public.app_users where is_active = true
    and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
    and (role = 'admin' or permissions && array['precintos', 'user_admin']::text[]))
);

drop policy if exists "precintos_asignaciones_insert" on public.precintos_asignaciones;
create policy "precintos_asignaciones_insert" on public.precintos_asignaciones
for insert to authenticated with check (
  exists (select 1 from public.app_users where is_active = true
    and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
    and (role = 'admin' or 'precintos' = any(permissions)))
);

drop policy if exists "precintos_asignaciones_read" on public.precintos_asignaciones;
create policy "precintos_asignaciones_read" on public.precintos_asignaciones
for select to authenticated using (
  exists (select 1 from public.app_users where is_active = true
    and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
    and (role = 'admin' or permissions && array['precintos', 'audit']::text[]))
);

drop policy if exists "precintos_storage_select" on storage.objects;
create policy "precintos_storage_select" on storage.objects
for select to authenticated using (
  bucket_id = 'evidencias-basc' and name like 'precintos/%'
  and exists (select 1 from public.app_users where is_active = true
    and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
    and (role = 'admin' or permissions && array['precintos', 'audit']::text[]))
);

drop policy if exists "precintos_storage_insert" on storage.objects;
create policy "precintos_storage_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'evidencias-basc' and name like 'precintos/%'
  and exists (select 1 from public.app_users where is_active = true
    and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
    and (role = 'admin' or 'precintos' = any(permissions)))
);

drop policy if exists "precintos_storage_update" on storage.objects;
create policy "precintos_storage_update" on storage.objects
for update to authenticated using (bucket_id = 'evidencias-basc' and name like 'precintos/%')
with check (bucket_id = 'evidencias-basc' and name like 'precintos/%');
