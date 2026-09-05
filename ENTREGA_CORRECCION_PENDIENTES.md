# Entrega: pendientes y compatibilidad del nuevo sellado

Preparado el 5 de septiembre de 2026, sobre el commit 1333c3a (V14.3).

## Estado de esta entrega

Cambios locales preparados; NO desplegados. SQL NO ejecutado. Se revisaron archivos y diferencias de Git. Por instruccion del usuario no se ejecutaron la aplicacion, compilacion, lint ni pruebas. La validacion funcional y la compilacion en la nube siguen pendientes.

El usuario confirmo que el sellado todavia no se utiliza y esta en mantenimiento. Esta entrega lo deja sin exigir en todas las operaciones existentes y nuevas. La migracion esta completa y no requiere indicar una fecha de inicio. Su activacion obligatoria sera una entrega posterior, expresamente autorizada, solo para nuevas operaciones del recorrido completo.

## Evidencia del incidente

- La base tiene 1.033 salidas y 1.035 ingresos segun las consultas compartidas. El codigo anterior descargaba todas las salidas sin paginar y filtraba en JavaScript. El limite API por defecto de 1.000 filas explica potencialmente salidas cerradas que reaparecen; no se inspecciono la respuesta HTTP ni la configuracion efectiva de produccion.
- F-SU-02 y F-SU-03 recortaban a 80 registros ANTES de buscar pendientes.
- SWO546_2026-08-31_01 y TMW980_2026-08-28_01 tienen cierres administrativos del 4 de septiembre, sin F-SU-03. La lista anterior no excluia operaciones cerradas.
- Los selectores conservaban su lista despues de guardar.
- La nueva supervision se exigia a todas las operaciones de acopio a puerto, incluidas las anteriores a su implementacion.

## Cambios preparados

1. Funcion SQL autorizada por permiso, que calcula pendientes con EXISTS/NOT EXISTS antes de paginar. La API lee paginas de 100 hasta terminar; no descarga las tablas historicas completas. Las consultas de listas no actualizan estados.
2. Todas las listas operativas excluyen salidas existentes y estados de salida completos, incluidos cierres administrativos.
3. Bandera `requiere_sellado` por operacion: false para todos los registros existentes y false por defecto para los nuevos. El flujo completo sigue 01 -> 02 -> 03 -> 04. Esta migracion desactiva el requisito; no reutilizarla cuando se haya autorizado una activacion futura del sellado.
4. No se marca ninguna operacion como sellada. La auditoria explica que el sellado no es obligatorio y el PDF no lo incluye como formulario pendiente cuando no corresponde; se conservan supervisiones existentes.
5. Los formularios 2, 3 y 4 recargan sus selectores tras guardar.
6. F-SU-04 usa fecha y hora actuales de Colombia al seleccionar una operacion, manteniendo el identificador del ingreso.
7. F-SU-04 crea una salida nueva; no sobrescribe una existente. Las evidencias usan una carpeta unica por intento para no reemplazar fotos anteriores. Un intento fallido puede dejar archivos sin registro; esta entrega no borra archivos automaticamente.
8. Triggers validan la secuencia, impiden continuar operaciones cerradas y sincronizan la salida en la misma transaccion que el registro. Los cierres excepcionales siguen usando la funcion administrativa con service_role; no crean cargues ni sellados ficticios.

## Orden de puesta en produccion

1. Usar el archivo completo `database/correccion_pendientes_sellado.sql`. No hay fechas ni marcadores que completar. Preparar el despliegue con la compilacion y las comprobaciones funcionales en un entorno de prueba con el mismo esquema antes de aplicarlo a produccion.
2. En una ventana sin diligenciamiento de formularios, ejecutar ese archivo en Supabase SQL Editor. Requiere las migraciones de supervision y cierre administrativo que ya estan presentes segun las consultas compartidas. Si falla, conservar el mensaje y ejecutar ROLLBACK antes de reintentar; no continuar con un despliegue parcial.
3. Desplegar juntos los archivos de codigo modificados. No publicar el codigo nuevo antes de crear la funcion SQL y la columna. Verificar que el despliegue utiliza el mismo proyecto Supabase consultado.
4. Confirmar que la compilacion de la nube pasa. Recargar las paginas abiertas para que usen el nuevo codigo.
5. Ejecutar por separado las consultas de `database/verificar_pendientes_sellado.sql`. Comparar conteos con los anteriores, considerando las operaciones reales registradas entretanto.
6. Validar con usuario administrador y con los roles que realmente diligencian los formularios. La funcion consulta tablas de otras etapas bajo permisos controlados; no cambia las politicas de lectura de esas tablas.

No se ha hecho commit, push ni despliegue de esta entrega desde Codex.

## Resultado esperado con los datos compartidos

Mientras el sellado siga sin exigir y no se registren otras operaciones o salidas:

- F-SU-04 muestra SWO546_2026-09-03_01 y SNX063_2026-09-03_01.
- SWO546 no necesita crear un sellado retroactivo para salir.
- Las dos operaciones con cierre administrativo no aparecen en F-SU-03; permanecen auditables con su cargue faltante.
- Ninguna operacion que tenga F-SU-04 aparece como pendiente operativo.

No se puede garantizar la ausencia de otros pendientes historicos de F-SU-02/F-SU-03 sin consultar todo el historial; la nueva consulta los incluye si estaban ocultos por el recorte de 80.

## Comprobaciones funcionales pendientes en la nube

En un entorno de prueba con el mismo esquema (sin crear registros ficticios en produccion):

- Una operacion antigua de acopio a puerto, con inspeccion y cargue, puede salir sin supervision nueva.
- Una nueva de acopio a puerto exige 01 -> 02 -> 03 -> 04. La ausencia de sellado y un eventual stand_by no bloquean la salida mientras requiere_sellado sea false.
- Fruta a acopio, materiales y Otro siguen 01 -> 04.
- Un cierre administrativo desaparece de todas las listas y conserva sus observaciones.
- Guardar una salida la elimina del selector; recargar y volver a entrar no la devuelve.
- Dos navegadores no pueden guardar dos salidas ni reemplazar la ya confirmada.
- Mas de 1.000 salidas historicas y un pendiente fuera de los ultimos 80 no alteran el resultado correcto.
- Un usuario sin el permiso del formulario no puede invocar su listado.
- Auditoria y PDF conservan las evidencias y no presentan como pendiente el sellado no exigible.

## Si hay un fallo en el despliegue

Conservar el error exacto y el estado del SQL/compilacion. No restaurar el codigo anterior como solucion definitiva: vuelve a introducir la consulta truncada y la exigencia retroactiva. No borrar salidas, cierres, fotos ni marcar etapas faltantes como completas. La correccion de un dato historico debe revisarse por operacion.

## Activacion futura del sellado

No se activa en esta entrega. Cuando el modulo este probado y se autorice su uso, preparar una nueva migracion para exigirlo solo a las operaciones nuevas de acopio a puerto, manteniendo false en las existentes. No ejecutar actualizaciones masivas a true sobre operaciones historicas.
