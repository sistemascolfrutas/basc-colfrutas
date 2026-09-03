# Nota de trabajo: relación entre entrada y salida de precintos

Fecha: 2 de septiembre de 2026

## Contexto del proceso

- Los precintos se reciben y se registran en portería.
- En el momento de la entrada todavía no se conoce el vehículo al que será asignado cada precinto.
- Esa asignación es confidencial y no debe anticiparse ni mostrarse durante la recepción.
- La salida ocurre cuando el vehículo ya está cargado y están a punto de cerrar sus puertas. En ese momento solicitan el precinto en portería y se registra su entrega.
- Actualmente la entrada y la salida se guardan como registros independientes, sin una relación explícita.

## Recomendación acordada

Manejar cada número de precinto como una unidad individual de inventario y relacionar su entrada con su salida mediante ese número único.

Flujo propuesto:

1. Portería registra la recepción del precinto.
2. El precinto queda con estado `Disponible en portería` y sin vehículo, conductor u operación asociados.
3. Cuando solicitan el precinto para cerrar un vehículo ya cargado, portería selecciona uno que esté disponible.
4. Al confirmar la salida, se crea la relación con su registro de entrada y el estado cambia a `Entregado`.
5. El sistema bloquea ese número para impedir que vuelva a entregarse.

Trazabilidad esperada:

`Entrada en portería -> Disponible -> Salida/entrega -> Instalado (opcional)`

## Confidencialidad

Antes de la salida, el registro del precinto solamente debería contener:

- Número único.
- Fecha y hora de recepción.
- Persona que lo recibió.
- Estado.
- Observaciones de recepción.

No debe asociarse anticipadamente con un vehículo, conductor, destino u operación.

En la salida se puede registrar la información permitida por el proceso. Si portería tampoco debe conocer el vehículo, se recomienda relacionar la entrega con un código de autorización u operación. La asociación entre ese código y el vehículo quedaría visible únicamente para usuarios autorizados.

## Estados sugeridos

- `Disponible en portería`
- `Reservado temporalmente` mientras se diligencia la salida
- `Entregado`
- `Instalado` si existe una confirmación posterior
- `Anulado`
- `Extraviado`

## Reglas importantes

- Un número de precinto debe ser único.
- Solo puede salir un precinto que esté disponible.
- Un precinto no puede registrar dos salidas activas.
- La salida debe conservar la referencia al registro de entrada original.
- La asignación no debe hacerse durante la entrada.
- Los datos confidenciales deben protegerse mediante permisos por rol.

## Pendiente para la próxima sesión

- Revisar las tablas SQL actuales de entrada y salida de precintos.
- Definir exactamente qué datos puede ver portería al registrar la salida.
- Decidir si se usará vehículo, nombre de operación o código de autorización como referencia confidencial.
- Diseñar la migración de base de datos sin perder los registros existentes.
- Ajustar la interfaz para seleccionar únicamente precintos disponibles.
- Agregar validaciones contra duplicados y doble entrega.

