-- Agrega el permiso independiente de SALIDA DE PRECINTO a las politicas.
-- No modifica tablas ni registros existentes.

begin;

drop policy if exists "precintos_empleados_read" on public.precintos_empleados;
create policy "precintos_empleados_read"
on public.precintos_empleados for select to authenticated
using (
  exists (
    select 1 from public.app_users
    where is_active = true
      and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
      and (role = 'admin' or permissions && array['precintos', 'salida_precintos', 'user_admin']::text[])
  )
);

drop policy if exists "precintos_salidas_read" on public.precintos_salidas;
create policy "precintos_salidas_read"
on public.precintos_salidas for select to authenticated
using (
  exists (
    select 1 from public.app_users
    where is_active = true
      and (auth.uid() = auth_user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = email)
      and (role = 'admin' or permissions && array['salida_precintos', 'audit']::text[])
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
      and (role = 'admin' or 'salida_precintos' = any(permissions))
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
      and (role = 'admin' or permissions && array['salida_precintos', 'audit']::text[])
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
      and (role = 'admin' or 'salida_precintos' = any(permissions))
  )
);

commit;
