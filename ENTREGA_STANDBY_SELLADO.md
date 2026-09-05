# STAND BY de supervision de sellado

Cambios locales preparados. No se ejecuto la aplicacion ni se aplico SQL en la nube.

- Cada STAND BY conserva el evento completo en Supabase y permanece seleccionado al guardar.
- Al retomar se muestran todas las fotos, ambas firmas, numeros, tipos, cantidad, responsables, cedulas y observaciones como registros bloqueados. Las selecciones guardadas usan los nombres historicos incluso si el empleado cambio o esta inactivo.
- La API genera enlaces temporales de una hora para las evidencias privadas. Recargar la pagina renueva los enlaces sin cambiar las evidencias.
- Los campos para agregar un evento nuevo estan separados del historial; cambiar de operacion limpia esos campos y firmas para evitar mezclar vehiculos.
- Guardar y finalizar aparece antes de STAND BY.
- Se conserva el comportamiento de un evento completo por guardado: requiere entre uno y cinco precintos nuevos, fotos y dos firmas. No se implemento guardar formularios parciales ni finalizar reutilizando los precintos de otro evento.
- El SQL permite listar operaciones de flujo completo abiertas con inspeccion y cargue, aunque el sellado sea opcional. No cambia requiere_sellado ni lo vuelve obligatorio para F-SU-04.
- Los triggers bloquean editar o borrar eventos guardados y cambiar el embarque. Las politicas restrictivas impiden a usuarios authenticated sobrescribir o borrar archivos de supervision-sellado. Esto no impide acciones privilegiadas de administracion fuera de la aplicacion.

## Despliegue

1. Aplicar database/sellado_standby_bloqueado.sql despues de la migracion correccion_pendientes_sellado.sql ya entregada. No modifica datos guardados; cambia el listado, triggers y politicas. No volver a ejecutar la migracion anterior encima, porque restauraria el filtro que ocultaba operaciones opcionales.
2. Publicar src/components/sellado-saved-event.tsx, src/components/supervision-sellado-form.tsx y src/app/api/supervision-sellado/route.ts.
3. Validar en un entorno de prueba con un registro STAND BY: guardar, recargar, seleccionar otra vez y comprobar cada foto, firma, seleccion y observacion. Verificar que no hay controles para cambiar el historial y que al agregar otro evento el anterior se conserva.
4. Verificar que Guardar y finalizar sigue disponible, que una supervision finalizada sale de pendientes y que F-SU-04 no exige sellado durante mantenimiento.

Validacion local realizada: TypeScript completo con --noEmit --incremental false, ESLint de los tres archivos y git diff --check. La prueba funcional de interfaz y de SQL queda pendiente en el entorno de prueba; no se inicio un servidor ni se consulto la base real.
