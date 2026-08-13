import type { SupabaseClient } from "@supabase/supabase-js";

import { saveSingleFormRecordWithClient } from "@/lib/form-records";
import {
  validateImageFile,
  validateOneOf,
  validateOperationDate,
  validatePlate,
  validateRequiredText,
} from "@/lib/form-validation";
import {
  buildSalidaStatusPatch,
  requireOperacionSalidaWithClient,
  syncOperacionStatusWithClient,
} from "@/lib/operaciones-maestra";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const PUERTAS_SELLOS_OPTIONS = ["Si", "No", "No aplica"] as const;

type EvidenciaKey =
  | "fotoFinalUnidadSalida"
  | "fotoPrecintoCorrea"
  | "fotoPrecintoBotella"
  | "fotoOtroPrecinto";

export type Fsu04Input = {
  nombreOperacion?: string;
  tipoOperacion?: string;
  fechaHoraSalida: string;
  placaNumeroContenedor: string;
  puertasCerradasSellosInstalados:
    | (typeof PUERTAS_SELLOS_OPTIONS)[number]
    | "";
  precintoSeguridad: string;
  observaciones: string;
};

export type EvidenciasFsu04Input = Record<EvidenciaKey, File | null>;

export const EVIDENCIAS_CONFIG: Record<
  EvidenciaKey,
  { fileName: string; column: string; optional?: boolean; sealOnly?: boolean }
> = {
  fotoFinalUnidadSalida: {
    fileName: "foto-final-unidad-salida",
    column: "foto_final_unidad_salida_url",
  },
  fotoPrecintoCorrea: {
    fileName: "precinto-correa",
    column: "foto_precinto_correa_url",
    sealOnly: true,
  },
  fotoPrecintoBotella: {
    fileName: "precinto-botella",
    column: "foto_precinto_botella_url",
    sealOnly: true,
  },
  fotoOtroPrecinto: {
    fileName: "otro-precinto",
    column: "foto_otro_precinto_url",
    optional: true,
    sealOnly: true,
  },
};

export async function createFsu04Salida(
  input: Fsu04Input,
  evidencias: EvidenciasFsu04Input,
) {
  const supabase = getSupabaseBrowserClient();
  return createFsu04SalidaWithClient(supabase, input, evidencias);
}

export async function createFsu04SalidaWithClient(
  supabase: SupabaseClient,
  input: Fsu04Input,
  evidencias: EvidenciasFsu04Input,
) {
  validateFsu04Input(input, evidencias);
  const fechaOperacion = getOperationDateFromDateTime(input.fechaHoraSalida);
  const placa = normalizePlate(input.placaNumeroContenedor);
  const nombreOperacion =
    input.nombreOperacion?.trim() || buildNombreOperacion(placa, fechaOperacion);

  const { operacion, requiereFlujoCompleto } =
    await requireOperacionSalidaWithClient(supabase, {
      placa,
      fecha: fechaOperacion,
      nombreOperacion,
    });

  if (requiereFlujoCompleto) {
    validateRequiredText(input.precintoSeguridad, "El precinto de seguridad");
    validateImageFile(evidencias.fotoPrecintoCorrea, "Precinto de correa");
    validateImageFile(evidencias.fotoPrecintoBotella, "Precinto de botella");
    validateImageFile(evidencias.fotoOtroPrecinto, "Otro precinto", true);
  }

  const evidenciasFolder =
    operacion.ruta_evidencias_folder ?? `evidencias/${nombreOperacion}`;

  const uploadedUrls = await uploadFsu04Evidencias(
    supabase,
    evidenciasFolder,
    nombreOperacion,
    evidencias,
    requiereFlujoCompleto,
  );

  const payload = {
    nombre_operacion: nombreOperacion,
    fecha_hora_salida: input.fechaHoraSalida,
    placa_numero_contenedor: placa,
    puertas_cerradas_sellos_instalados:
      input.puertasCerradasSellosInstalados,
    precinto_seguridad: requiereFlujoCompleto
      ? input.precintoSeguridad.trim()
      : null,
    observaciones: input.observaciones.trim() || null,
    ...uploadedUrls,
  };

  const data = await saveSingleFormRecordWithClient(
    supabase,
    "reg_fsu04_salida",
    payload,
  );
  await syncOperacionStatusWithClient(
    supabase,
    nombreOperacion,
    buildSalidaStatusPatch(requiereFlujoCompleto),
  );

  return data;
}

async function uploadFsu04Evidencias(
  supabase: SupabaseClient,
  evidenciasFolder: string,
  nombreOperacion: string,
  evidencias: EvidenciasFsu04Input,
  requiereFlujoCompleto: boolean,
) {
  const bucketName =
    process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";
  const uploaded: Record<string, string> = {};

  for (const [key, file] of Object.entries(evidencias) as Array<
    [EvidenciaKey, File | null]
  >) {
    const config = EVIDENCIAS_CONFIG[key];

    if (config.sealOnly && !requiereFlujoCompleto) {
      continue;
    }

    if (!file) {
      if (config.optional) {
        continue;
      }

      throw new Error(`Falta cargar el archivo obligatorio: ${key}.`);
    }

    const extension = getFileExtension(file.name);
    const path = `${evidenciasFolder}/fsu04/${config.fileName}-${nombreOperacion}.${extension}`;

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

export function validateFsu04Input(
  input: Fsu04Input,
  evidencias: EvidenciasFsu04Input,
) {
  validateRequiredText(
    input.fechaHoraSalida,
    "La fecha y hora de salida de la unidad",
  );
  validateOperationDate(
    getOperationDateFromDateTime(input.fechaHoraSalida),
    "La fecha de salida de la unidad",
  );
  validatePlate(input.placaNumeroContenedor);
  validateOneOf(
    input.puertasCerradasSellosInstalados,
    PUERTAS_SELLOS_OPTIONS,
    "La confirmacion de puertas cerradas y sellos instalados",
  );
  validateImageFile(
    evidencias.fotoFinalUnidadSalida,
    "Foto final de la unidad al momento de la salida",
  );

}

export function getOperationDateFromDateTime(value: string) {
  return normalizeOperationDate(value.split("T")[0] ?? "");
}
