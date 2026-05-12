-- Ejecutar en Supabase SQL Editor.
-- Politicas RLS para que F-SU-04 se guarde y se lea sin usar service_role
-- desde las rutas normales de la aplicacion.

alter table public.reg_fsu04_salida enable row level security;

drop policy if exists "reg_fsu04_salida_select_allowed" on public.reg_fsu04_salida;
drop policy if exists "reg_fsu04_salida_insert_allowed" on public.reg_fsu04_salida;
drop policy if exists "reg_fsu04_salida_update_allowed" on public.reg_fsu04_salida;

create policy "reg_fsu04_salida_select_allowed"
on public.reg_fsu04_salida
for select
to authenticated
using (
  exists (
    select 1
    from public.app_users
    where is_active = true
      and (
        auth.uid() = auth_user_id
        or lower(coalesce(auth.jwt() ->> 'email', '')) = email
      )
      and (
        role = 'admin'
        or permissions && array['fsu04', 'audit']::text[]
      )
  )
);

create policy "reg_fsu04_salida_insert_allowed"
on public.reg_fsu04_salida
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_users
    where is_active = true
      and (
        auth.uid() = auth_user_id
        or lower(coalesce(auth.jwt() ->> 'email', '')) = email
      )
      and (
        role = 'admin'
        or 'fsu04' = any(permissions)
      )
  )
);

create policy "reg_fsu04_salida_update_allowed"
on public.reg_fsu04_salida
for update
to authenticated
using (
  exists (
    select 1
    from public.app_users
    where is_active = true
      and (
        auth.uid() = auth_user_id
        or lower(coalesce(auth.jwt() ->> 'email', '')) = email
      )
      and (
        role = 'admin'
        or 'fsu04' = any(permissions)
      )
  )
)
with check (
  exists (
    select 1
    from public.app_users
    where is_active = true
      and (
        auth.uid() = auth_user_id
        or lower(coalesce(auth.jwt() ->> 'email', '')) = email
      )
      and (
        role = 'admin'
        or 'fsu04' = any(permissions)
      )
  )
);
