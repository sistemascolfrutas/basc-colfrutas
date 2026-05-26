import type { SupabaseClient } from "@supabase/supabase-js";

import { createSingleFormRecordWithClient } from "@/lib/form-records";
import {
  validateImageFile,
  validateOneOf,
  validateOperationDate,
  validatePlate,
  validateRequiredBoolean,
  validateRequiredText,
} from "@/lib/form-validation";
import {
  syncOperacionStatusWithClient,
} from "@/lib/operaciones-maestra";
import {
  buildEvidenciasFolderPath,
  buildNombreOperacion,
  buildNombreOperacionConsecutivo,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";
import { getResponsableOptionsWithClient } from "@/lib/responsables";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const TIPO_OPERACION_OPTIONS = [
  "Transporte de materiales a productor",
  "Transporte de fruta a centro de acopio",
  "Transporte de acopio a puerto",
  "Otro",
] as const;

export const TIPO_OPERACION_CONTINUA_FLUJO =
  "Transporte de acopio a puerto" as const;

export const TIPO_VEHICULO_OPTIONS = [
  "Camion",
  "Tractocamion",
  "Furgon",
  "Contenedor",
  "Otro",
] as const;

type EvidenciaKey =
  | "fotoFrontalVehiculo"
  | "fotoPlaca"
  | "fotoParteTraseraPuertas"
  | "fotoInteriorUnidadCarga";

export type Fsu01Input = {
  fechaRegistro: string;
  horaRegistro: string;
  tipoOperacion: (typeof TIPO_OPERACION_OPTIONS)[number] | "";
  tipoOperacionOtro: string;
  placa: string;
  tipoVehiculo: (typeof TIPO_VEHICULO_OPTIONS)[number] | "";
  tipoVehiculoOtro: string;
  empresaTransportadora: string;
  origen: string;
  destino: string;
  nombreConductor: string;
  numeroCedula: string;
  validacionVisualIngreso: boolean | null;
  autorizaIngreso: boolean | null;
  responsable: string;
  observaciones: string;
};

export type EvidenciasInput = Record<EvidenciaKey, File | null>;

export const EVIDENCIAS_CONFIG: Record<
  EvidenciaKey,
  { fileName: string; column: string }
> = {
  fotoFrontalVehiculo: {
    fileName: "foto-frontal-vehiculo",
    column: "foto_frontal_vehiculo_url",
  },
  fotoPlaca: {
    fileName: "foto-placa",
    column: "foto_placa_url",
  },
  fotoParteTraseraPuertas: {
    fileName: "foto-parte-trasera-puertas",
    column: "foto_parte_trasera_puertas_url",
  },
  fotoInteriorUnidadCarga: {
    fileName: "foto-interior-unidad-carga",
    column: "foto_interior_unidad_carga_url",
  },
};

export async function createFsu01Ingreso(
  input: Fsu01Input,
  evidencias: EvidenciasInput,
) {
  const supabase = getSupabaseBrowserClient();
  return createFsu01IngresoWithClient(supabase, input, evidencias);
}

export async function createFsu01IngresoWithClient(
  supabase: SupabaseClient,
  input: Fsu01Input,
  evidencias: EvidenciasInput,
  options?: { responsableOptions?: string[] },
) {
  validateFsu01Input(input, evidencias);
  const responsableOptions =
    options?.responsableOptions ?? (await getResponsableOptionsWithClient(supabase));
  validateSelectedResponsable(input.responsable, responsableOptions);
  const fechaRegistro = normalizeOperationDate(input.fechaRegistro);
  const placa = normalizePlate(input.placa);
  const operacion = await createNextOperacionIngresoWithClient(supabase, {
    placa,
    fecha: fechaRegistro,
    conductor: input.nombreConductor,
    empresaTransportadora: input.empresaTransportadora,
  });

  const nombreOperacion = operacion.nombre_operacion;
  const evidenciasFolder =
    operacion.ruta_evidencias_folder ?? `evidencias/${nombreOperacion}`;

  const uploadedUrls = await uploadFsu01Evidencias(
    supabase,
    evidenciasFolder,
    nombreOperacion,
    evidencias,
  );

  const payload = {
    nombre_operacion: nombreOperacion,
    fecha_registro: fechaRegistro,
    hora_registro: input.horaRegistro.trim(),
    tipo_operacion: input.tipoOperacion,
    tipo_operacion_otro: input.tipoOperacionOtro.trim() || null,
    placa,
    tipo_vehiculo: input.tipoVehiculo,
    tipo_vehiculo_otro:
      input.tipoVehiculo === "Otro" ? input.tipoVehiculoOtro.trim() || null : null,
    empresa_transportadora: input.empresaTransportadora.trim(),
    origen: input.origen.trim(),
    destino: input.destino.trim(),
    nombre_conductor: input.nombreConductor.trim(),
    numero_cedula: input.numeroCedula.trim(),
    validacion_visual_ingreso: input.validacionVisualIngreso,
    autoriza_ingreso: input.autorizaIngreso,
    responsable: input.responsable.trim(),
    observaciones: input.observaciones.trim() || null,
    ...uploadedUrls,
  };

  const data = await createSingleFormRecordWithClient(
    supabase,
    "reg_fsu01_ingreso",
    payload,
  );
  await syncOperacionStatusWithClient(supabase, nombreOperacion, {
    estado_ingreso: "completo",
    conductor: input.nombreConductor.trim(),
    empresa_transportadora: input.empresaTransportadora.trim(),
  });

  return data;
}

type CreateNextOperacionIngresoInput = {
  placa: string;
  fecha: string;
  conductor: string;
  empresaTransportadora: string;
};

type OperacionIngresoRecord = {
  id: string;
  nombre_operacion: string;
  ruta_evidencias_folder: string | null;
};

async function createNextOperacionIngresoWithClient(
  supabase: SupabaseClient,
  input: CreateNextOperacionIngresoInput,
) {
  const baseNombreOperacion = buildNombreOperacion(input.placa, input.fecha);
  const { data: operaciones, error: operacionesError } = await supabase
    .from("operaciones_maestra")
    .select("nombre_operacion")
    .eq("placa", input.placa)
    .eq("fecha", input.fecha)
    .order("created_at", { ascending: false })
    .returns<Array<{ nombre_operacion: string }>>();

  if (operacionesError) {
    throw new Error(
      `No fue posible validar operaciones abiertas para ${baseNombreOperacion}: ${operacionesError.message}`,
    );
  }

  const nombresOperacion = (operaciones ?? []).map(
    (operacion) => operacion.nombre_operacion,
  );

  if (nombresOperacion.length > 0) {
    const { data: salidas, error: salidasError } = await supabase
      .from("reg_fsu04_salida")
      .select("nombre_operacion")
      .in("nombre_operacion", nombresOperacion)
      .returns<Array<{ nombre_operacion: string }>>();

    if (salidasError) {
      throw new Error(
        `No fue posible validar salidas para ${baseNombreOperacion}: ${salidasError.message}`,
      );
    }

    const nombresConSalida = new Set(
      (salidas ?? []).map((salida) => salida.nombre_operacion),
    );
    const operacionAbierta = nombresOperacion.find(
      (nombreOperacion) => !nombresConSalida.has(nombreOperacion),
    );

    if (operacionAbierta) {
      throw new Error(
        `No se puede guardar el F-SU-01 porque este vehiculo aun tiene un proceso abierto (${operacionAbierta}). Primero registra la salida en F-SU-04 para poder ingresarlo nuevamente.`,
      );
    }
  }

  const siguienteConsecutivo = getNextOperacionConsecutivo(
    baseNombreOperacion,
    nombresOperacion,
  );
  const nombreOperacion = buildNombreOperacionConsecutivo(
    input.placa,
    input.fecha,
    siguienteConsecutivo,
  );
  const rutaEvidenciasFolder = buildEvidenciasFolderPath(nombreOperacion);

  const { data, error } = await supabase
    .from("operaciones_maestra")
    .insert({
      nombre_operacion: nombreOperacion,
      placa: input.placa,
      fecha: input.fecha,
      conductor: input.conductor.trim() || null,
      empresa_transportadora: input.empresaTransportadora.trim() || null,
      ruta_evidencias_folder: rutaEvidenciasFolder,
      estado_ingreso: "pendiente",
      estado_inspeccion: "pendiente",
      estado_cargue: "pendiente",
      estado_salida: "pendiente",
    })
    .select("id,nombre_operacion,ruta_evidencias_folder")
    .single<OperacionIngresoRecord>();

  if (error) {
    throw new Error(
      `No fue posible crear la operacion ${nombreOperacion}: ${error.message}`,
    );
  }

  return data;
}

function getNextOperacionConsecutivo(
  baseNombreOperacion: string,
  nombresOperacion: string[],
) {
  const consecutivos = nombresOperacion.map((nombreOperacion) => {
    if (nombreOperacion === baseNombreOperacion) {
      return 1;
    }

    const match = nombreOperacion.match(
      new RegExp(`^${escapeRegExp(baseNombreOperacion)}_(\\d+)$`),
    );

    return match ? Number(match[1]) : 0;
  });

  return Math.max(0, ...consecutivos) + 1;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateSelectedResponsable(value: string, options: string[]) {
  const selectedValue = value.trim();

  if (options.length === 0) {
    throw new Error(
      "No hay responsables activos. Solicita al administrador configurar el catalogo.",
    );
  }

  if (!options.some((option) => option.trim() === selectedValue)) {
    throw new Error("El responsable seleccionado ya no esta disponible. Vuelve a elegirlo.");
  }
}

async function uploadFsu01Evidencias(
  supabase: SupabaseClient,
  evidenciasFolder: string,
  nombreOperacion: string,
  evidencias: EvidenciasInput,
) {
  const bucketName =
    process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";

  const entries = Object.entries(evidencias) as Array<[EvidenciaKey, File | null]>;
  const uploaded: Record<string, string> = {};

  for (const [key, file] of entries) {
    if (!file) {
      throw new Error(`Falta cargar el archivo obligatorio: ${key}.`);
    }

    const extension = getFileExtension(file.name);
    const config = EVIDENCIAS_CONFIG[key];
    const path = `${evidenciasFolder}/fsu01/${config.fileName}-${nombreOperacion}.${extension}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, { upsert: true });

    if (error) {
      throw new Error(`No fue posible subir ${config.fileName}: ${error.message}`);
    }

    uploaded[config.column] = path;
  }

  return uploaded;
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.at(-1)?.toLowerCase();

  return extension && extension !== fileName.toLowerCase() ? extension : "jpg";
}

export function validateFsu01Input(
  input: Fsu01Input,
  evidencias: EvidenciasInput,
) {
  validateOperationDate(input.fechaRegistro, "La fecha del registro");
  validatePlate(input.placa);
  validateRequiredText(input.horaRegistro, "La hora del registro");
  validateOneOf(
    input.tipoOperacion,
    TIPO_OPERACION_OPTIONS,
    "El tipo de operacion",
  );
  validateOneOf(
    input.tipoVehiculo,
    TIPO_VEHICULO_OPTIONS,
    "El tipo de vehiculo",
  );
  validateRequiredText(
    input.empresaTransportadora,
    "La empresa transportadora",
  );
  validateRequiredText(input.nombreConductor, "El nombre del conductor");
  validateRequiredText(input.numeroCedula, "El numero de cedula");
  validateRequiredText(input.responsable, "El responsable");
  validateRequiredBoolean(
    input.validacionVisualIngreso,
    "Se realizo validacion visual del vehiculo al ingreso",
  );
  validateRequiredBoolean(
    input.autorizaIngreso,
    "Se autoriza el ingreso del vehiculo",
  );

  if (input.tipoOperacion === "Otro") {
    validateRequiredText(
      input.tipoOperacionOtro,
      'El detalle de "Otro" en tipo de operacion',
    );
  }

  if (input.tipoVehiculo === "Otro") {
    validateRequiredText(
      input.tipoVehiculoOtro,
      'El detalle de "Otro" en tipo de vehiculo',
    );
  }

  validateImageFile(
    evidencias.fotoFrontalVehiculo,
    "Foto frontal del vehiculo",
  );
  validateImageFile(evidencias.fotoPlaca, "Foto de la placa");
  validateImageFile(
    evidencias.fotoParteTraseraPuertas,
    "Foto de la parte trasera o puertas",
  );
  validateImageFile(
    evidencias.fotoInteriorUnidadCarga,
    "Foto del interior de la unidad de carga",
  );
}
