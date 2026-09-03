-- Permite que Auxiliar de Comercio vea las fechas de entrada y salida.
drop policy if exists "precintos_recepciones_read" on public.precintos_recepciones;
create policy "precintos_recepciones_read" on public.precintos_recepciones for select to authenticated using (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or permissions && array['embarques','precintos','salida_precintos','audit']::text[]))
);

drop policy if exists "precintos_despachos_read" on public.precintos_despachos;
create policy "precintos_despachos_read" on public.precintos_despachos for select to authenticated using (
  exists (select 1 from public.app_users where is_active and
    (auth.uid() = auth_user_id or lower(coalesce(auth.jwt()->>'email','')) = email) and
    (role = 'admin' or permissions && array['embarques','salida_precintos','audit']::text[]))
);
