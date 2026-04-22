import type { SupabaseClient } from "@supabase/supabase-js";

import { saveSingleFormRecordWithClient } from "@/lib/form-records";
import {
  validateImageFile,
  validateOperationDate,
  validatePlate,
  validateRequiredBoolean,
  validateRequiredText,
  validateUniqueSelections,
} from "@/lib/form-validation";
import { getFsu03ParticipantOptionsWithClient } from "@/lib/fsu03-participants";
import { updateOperacionMaestraWithClient } from "@/lib/operacion-status";
import { requireOperacionIngresoWithClient } from "@/lib/operaciones-maestra";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type EvidenciaKey =
  | "fotoPomaRemisionCargue"
  | "fotoCargue25"
  | "fotoCargue50"
  | "fotoCargue75"
  | "fotoCargue100";

export type Fsu03Input = {
  fechaCargue: string;
  placa: string;
  seRealizoCargue: boolean | null;
  observacionesCargue: string;
  participante1: string;
  participante2: string;
  participante3: string;
};

export type EvidenciasFsu03Input = Record<EvidenciaKey, File | null>;

export const EVIDENCIAS_CONFIG: Record<
  EvidenciaKey,
  { fileName: string; column: string }
> =
  {
    fotoPomaRemisionCargue: {
      fileName: "foto-poma-remision-cargue",
      column: "foto_poma_remision_cargue_url",
    },
    fotoCargue25: {
      fileName: "foto-cargue-25",
      column: "foto_cargue_25_url",
    },
    fotoCargue50: {
      fileName: "foto-cargue-50",
      column: "foto_cargue_50_url",
    },
    fotoCargue75: {
      fileName: "foto-cargue-75",
      column: "foto_cargue_75_url",
    },
    fotoCargue100: {
      fileName: "foto-cargue-100",
      column: "foto_cargue_100_url",
    },
  };

export async function createFsu03Cargue(
  input: Fsu03Input,
  evidencias: EvidenciasFsu03Input,
) {
  const supabase = getSupabaseBrowserClient();
  return createFsu03CargueWithClient(supabase, input, evidencias);
}

export async function createFsu03CargueWithClient(
  supabase: SupabaseClient,
  input: Fsu03Input,
  evidencias: EvidenciasFsu03Input,
) {
  validateFsu03Input(input, evidencias);
  const participantOptions = await getFsu03ParticipantOptionsWithClient(supabase);
  validateSelectedParticipants(input, participantOptions);
  const fechaCargue = normalizeOperationDate(input.fechaCargue);
  const placa = normalizePlate(input.placa);

  const operacion = await requireOperacionIngresoWithClient(supabase, {
    placa,
    fecha: fechaCargue,
  });

  const nombreOperacion = buildNombreOperacion(placa, fechaCargue);
  const evidenciasFolder =
    operacion.ruta_evidencias_folder ?? `evidencias/${nombreOperacion}`;

  const uploadedUrls = await uploadFsu03Evidencias(
    supabase,
    evidenciasFolder,
    nombreOperacion,
    evidencias,
  );

  const payload = {
    nombre_operacion: nombreOperacion,
    fecha_cargue: fechaCargue,
    placa,
    se_realizo_cargue: input.seRealizoCargue,
    observaciones_cargue: input.observacionesCargue.trim(),
    participante_1: input.participante1,
    participante_2: input.participante2,
    participante_3: input.participante3,
    ...uploadedUrls,
  };

  const data = await saveSingleFormRecordWithClient(
    supabase,
    "reg_fsu03_cargue_aseguramiento",
    payload,
  );
  await updateOperacionMaestraWithClient(supabase, nombreOperacion, {
    estado_cargue: "completo",
  });

  return data;
}

async function uploadFsu03Evidencias(
  supabase: SupabaseClient,
  evidenciasFolder: string,
  nombreOperacion: string,
  evidencias: EvidenciasFsu03Input,
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
    const path = `${evidenciasFolder}/fsu03/${config.fileName}-${nombreOperacion}.${extension}`;

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

export function validateFsu03Input(
  input: Fsu03Input,
  evidencias: EvidenciasFsu03Input,
) {
  validateOperationDate(input.fechaCargue, "La fecha de cargue");
  validatePlate(input.placa);
  validateRequiredBoolean(input.seRealizoCargue, "Se realizo el cargue");
  validateRequiredText(
    input.observacionesCargue,
    "Las observaciones del cargue",
  );
  validateUniqueSelections(
    [input.participante1, input.participante2, input.participante3],
    "La seleccion de participantes",
  );

  validateImageFile(
    evidencias.fotoPomaRemisionCargue,
    "Foto de POMA o remision de cargue",
  );
  validateImageFile(evidencias.fotoCargue25, "Foto del cargue al 25%");
  validateImageFile(evidencias.fotoCargue50, "Foto del cargue al 50%");
  validateImageFile(evidencias.fotoCargue75, "Foto del cargue al 75%");
  validateImageFile(evidencias.fotoCargue100, "Foto del cargue al 100%");
}

function validateSelectedParticipants(
  input: Fsu03Input,
  options: string[],
) {
  if (options.length === 0) {
    throw new Error(
      "No hay participantes F-SU-03 activos. Solicita al administrador configurar el catalogo.",
    );
  }

  for (const [label, value] of [
    ["El participante 1", input.participante1],
    ["El participante 2", input.participante2],
    ["El participante 3", input.participante3],
  ] as const) {
    if (!options.includes(value)) {
      throw new Error(`${label} seleccionado ya no esta disponible. Vuelve a elegirlo.`);
    }
  }
}
