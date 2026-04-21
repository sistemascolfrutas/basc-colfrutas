export type OperacionEstado = "pendiente" | "en_proceso" | "completo";

export type OperacionMaestraInput = {
  placa: string;
  fecha: string;
  conductor?: string;
  empresaTransportadora?: string;
};

export function normalizePlate(placa: string) {
  return placa.replace(/\s+/g, "").toUpperCase().trim();
}

export function normalizeOperationDate(fecha: string) {
  return fecha.replace(/^_+/, "").trim();
}

export function buildNombreOperacion(placa: string, fecha: string) {
  const placaLimpia = normalizePlate(placa);
  const fechaLimpia = normalizeOperationDate(fecha);

  return `${placaLimpia}_${fechaLimpia}`;
}

export function buildEvidenciasFolderPath(nombreOperacion: string) {
  return `evidencias/${nombreOperacion}`;
}

export function buildOperacionPayload(input: OperacionMaestraInput) {
  const placa = normalizePlate(input.placa);
  const fecha = normalizeOperationDate(input.fecha);
  const nombreOperacion = buildNombreOperacion(placa, fecha);

  return {
    nombre_operacion: nombreOperacion,
    placa,
    fecha,
    conductor: input.conductor?.trim() || null,
    empresa_transportadora: input.empresaTransportadora?.trim() || null,
    ruta_evidencias_folder: buildEvidenciasFolderPath(nombreOperacion),
    estado_ingreso: "pendiente" as OperacionEstado,
    estado_inspeccion: "pendiente" as OperacionEstado,
    estado_cargue: "pendiente" as OperacionEstado,
    estado_salida: "pendiente" as OperacionEstado,
  };
}
