-- Aplicar antes de desplegar el nuevo campo de F-SU-04.
-- Se conserva precinto_seguridad para el campo renombrado a Precinto de botella.
-- No modifica ni elimina valores existentes.
ALTER TABLE public.reg_fsu04_salida
  ADD COLUMN IF NOT EXISTS precinto_correa text;
