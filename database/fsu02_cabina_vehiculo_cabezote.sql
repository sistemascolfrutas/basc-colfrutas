-- Migracion incremental para F-SU-02.
-- Agrega campos sin eliminar ni reemplazar datos existentes.
-- Las filas anteriores quedan con NULL en estas columnas.

alter table public.reg_fsu02_inspeccion
  add column if not exists orden_aseo_cabina boolean,
  add column if not exists puertas_ajustadas_cabina boolean,
  add column if not exists techo_cabina_buen_estado boolean,
  add column if not exists piso_interior_remolque_limpio boolean,
  add column if not exists estado_puertas_furgon boolean,
  add column if not exists estado_bastidores boolean,
  add column if not exists defensa_trasera boolean,
  add column if not exists parachoques_neumaticos_rines boolean,
  add column if not exists puertas_compartimientos_herramientas boolean,
  add column if not exists caja_bateria boolean,
  add column if not exists caja_filtro_aire boolean,
  add column if not exists tanque_combustible boolean,
  add column if not exists compartimiento_interior_cabina_dormitorio boolean,
  add column if not exists rompevientos_deflectores_techo boolean,
  add column if not exists soportes_metalicos_carroceria_furgon boolean,
  add column if not exists quinta_rueda boolean;
