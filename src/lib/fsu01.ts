import { saveSingleFormRecord } from "@/lib/form-records";
import {
  validateImageFile,
  validateOperationDate,
  validatePlate,
  validateRequiredBoolean,
  validateRequiredText,
} from "@/lib/form-validation";
import { updateOperacionMaestra } from "@/lib/operacion-status";
import { getOrCreateOperacionMaestra } from "@/lib/operaciones-maestra";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const TIPO_OPERACION_OPTIONS = [
  "Transporte de materiales a productor",
  "Transporte de fruta a centro de acopio",
  "Transporte de acopio a puerto",
  "Otro",
] as const;

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

const EVIDENCIAS_CONFIG: Record<
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
  validateFsu01Input(input, evidencias);

  const supabase = getSupabaseBrowserClient();
  const fechaRegistro = normalizeOperationDate(input.fechaRegistro);
  const placa = normalizePlate(input.placa);

  const operacion = await getOrCreateOperacionMaestra({
    placa,
    fecha: fechaRegistro,
    conductor: input.nombreConductor,
    empresaTransportadora: input.empresaTransportadora,
  });

  const nombreOperacion = buildNombreOperacion(placa, fechaRegistro);
  const evidenciasFolder =
    operacion.data.ruta_evidencias_folder ?? `evidencias/${nombreOperacion}`;

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

  const data = await saveSingleFormRecord("reg_fsu01_ingreso", payload);
  await updateOperacionMaestra(nombreOperacion, {
    estado_ingreso: "completo",
    conductor: input.nombreConductor.trim(),
    empresa_transportadora: input.empresaTransportadora.trim(),
  });

  return data;
}

async function uploadFsu01Evidencias(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
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

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    uploaded[config.column] = data.publicUrl;
  }

  return uploaded;
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.at(-1)?.toLowerCase();

  return extension && extension !== fileName.toLowerCase() ? extension : "jpg";
}

function validateFsu01Input(input: Fsu01Input, evidencias: EvidenciasInput) {
  validateOperationDate(input.fechaRegistro, "La fecha del registro");
  validatePlate(input.placa);
  validateRequiredText(input.horaRegistro, "La hora del registro");
  validateRequiredText(input.tipoOperacion, "El tipo de operacion");
  validateRequiredText(input.tipoVehiculo, "El tipo de vehiculo");
  validateRequiredText(
    input.empresaTransportadora,
    "La empresa transportadora",
  );
  validateRequiredText(input.origen, "El origen");
  validateRequiredText(input.destino, "El destino");
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
