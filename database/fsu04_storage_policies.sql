-- Ejecutar en Supabase SQL Editor.
-- Politicas para que usuarios autorizados puedan subir, actualizar y leer
-- evidencias del F-SU-04 en el bucket evidencias-basc.

drop policy if exists "evidencias_fsu04_select_allowed" on storage.objects;
drop policy if exists "evidencias_fsu04_insert_allowed" on storage.objects;
drop policy if exists "evidencias_fsu04_update_allowed" on storage.objects;

create policy "evidencias_fsu04_select_allowed"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidencias-basc'
  and name like '%/fsu04/%'
  and exists (
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

create policy "evidencias_fsu04_insert_allowed"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidencias-basc'
  and name like '%/fsu04/%'
  and exists (
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

create policy "evidencias_fsu04_update_allowed"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidencias-basc'
  and name like '%/fsu04/%'
  and exists (
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
  bucket_id = 'evidencias-basc'
  and name like '%/fsu04/%'
  and exists (
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
