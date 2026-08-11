-- Migracion incremental para la seccion Remolque (trailer) de F-SU-02.
-- No elimina ni reemplaza datos existentes; las filas anteriores quedan en NULL.

alter table public.reg_fsu02_inspeccion
  add column if not exists pata_mecanica_trailer boolean,
  add column if not exists areas_quinta_rueda boolean,
  add column if not exists lado_derecho_trailer boolean,
  add column if not exists lado_izquierdo_trailer boolean,
  add column if not exists llantas_parachoques_luces_trailer boolean,
  add column if not exists placa_patin_trailer boolean,
  add column if not exists puntos_anclaje_trailer_contenedor boolean;
