import type { SupabaseClient } from "@supabase/supabase-js";

import { saveSingleFormRecordWithClient } from "@/lib/form-records";
import {
  validateImageFile,
  validateOneOf,
  validateOperationDate,
  validatePlate,
  validateRequiredBoolean,
  validateRequiredText,
} from "@/lib/form-validation";
import { updateOperacionMaestraWithClient } from "@/lib/operacion-status";
import { requireOperacionIngresoWithClient } from "@/lib/operaciones-maestra";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const CHECK_OPTIONS = ["Cumple", "No cumple", "No aplica"] as const;
export const RESULTADO_INSPECCION_OPTIONS = [
  "Apta",
  "Apta con observacion",
  "No apta",
] as const;

type EvidenciaKey =
  | "fotoLateralExternaUnidad"
  | "fotoInteriorVacioUnidadCarga"
  | "fotoPisoInterno"
  | "fotoTechoInterno"
  | "fotoPuertasSistemaCierre"
  | "fotoHallazgoNovedad";

export type Fsu02Input = {
  fechaInspeccion: string;
  placa: string;
  numeroRemolqueContenedor: string;
  estadoGeneralExternoUnidad: (typeof CHECK_OPTIONS)[number] | "";
  estadoPuertas: (typeof CHECK_OPTIONS)[number] | "";
  estadoParedesLaterales: (typeof CHECK_OPTIONS)[number] | "";
  estadoPiso: (typeof CHECK_OPTIONS)[number] | "";
  estadoTecho: (typeof CHECK_OPTIONS)[number] | "";
  estadoSistemaCierre: (typeof CHECK_OPTIONS)[number] | "";
  ausenciaPerforacionesDaniosVisibles: (typeof CHECK_OPTIONS)[number] | "";
  ausenciaElementosExtranos: (typeof CHECK_OPTIONS)[number] | "";
  condicionEstructuralAptaParaCargue: (typeof CHECK_OPTIONS)[number] | "";
  limpiezaInternaUnidad: (typeof CHECK_OPTIONS)[number] | "";
  ausenciaResiduos: (typeof CHECK_OPTIONS)[number] | "";
  ausenciaOloresExtranos: (typeof CHECK_OPTIONS)[number] | "";
  ausenciaHumedadDerrame: (typeof CHECK_OPTIONS)[number] | "";
  ausenciaContaminacionVisible: (typeof CHECK_OPTIONS)[number] | "";
  condicionAptaParaProductoATransportar: (typeof CHECK_OPTIONS)[number] | "";
  resultadoFinalInspeccion: (typeof RESULTADO_INSPECCION_OPTIONS)[number] | "";
  seAutorizaParaCargue: boolean | null;
  seDetectoNovedad: boolean | null;
  descripcionNovedad: string;
  responsableInspeccion: string;
};

export type EvidenciasFsu02Input = Record<EvidenciaKey, File | null>;

export const EVIDENCIAS_CONFIG: Record<
  EvidenciaKey,
  { fileName: string; column: string; optional?: boolean }
> = {
  fotoLateralExternaUnidad: {
    fileName: "foto-lateral-externa-unidad",
    column: "foto_lateral_externa_unidad_url",
  },
  fotoInteriorVacioUnidadCarga: {
    fileName: "foto-interior-vacio-unidad-carga",
    column: "foto_interior_vacio_unidad_carga_url",
  },
  fotoPisoInterno: {
    fileName: "foto-piso-interno",
    column: "foto_piso_interno_url",
  },
  fotoTechoInterno: {
    fileName: "foto-techo-interno",
    column: "foto_techo_interno_url",
  },
  fotoPuertasSistemaCierre: {
    fileName: "foto-puertas-sistema-cierre",
    column: "foto_puertas_sistema_cierre_url",
  },
  fotoHallazgoNovedad: {
    fileName: "foto-hallazgo-novedad",
    column: "foto_hallazgo_novedad_url",
    optional: true,
  },
};

export async function createFsu02Inspeccion(
  input: Fsu02Input,
  evidencias: EvidenciasFsu02Input,
) {
  const supabase = getSupabaseBrowserClient();
  return createFsu02InspeccionWithClient(supabase, input, evidencias);
}

export async function createFsu02InspeccionWithClient(
  supabase: SupabaseClient,
  input: Fsu02Input,
  evidencias: EvidenciasFsu02Input,
) {
  validateFsu02Input(input, evidencias);
  const fechaInspeccion = normalizeOperationDate(input.fechaInspeccion);
  const placa = normalizePlate(input.placa);

  const operacion = await requireOperacionIngresoWithClient(supabase, {
    placa,
    fecha: fechaInspeccion,
  });

  const nombreOperacion = buildNombreOperacion(placa, fechaInspeccion);
  const evidenciasFolder =
    operacion.ruta_evidencias_folder ?? `evidencias/${nombreOperacion}`;

  const uploadedUrls = await uploadFsu02Evidencias(
    supabase,
    evidenciasFolder,
    nombreOperacion,
    evidencias,
    input.seDetectoNovedad === true,
  );

  const payload = {
    nombre_operacion: nombreOperacion,
    fecha_inspeccion: fechaInspeccion,
    placa,
    numero_remolque_contenedor: input.numeroRemolqueContenedor.trim(),
    estado_general_externo_unidad: input.estadoGeneralExternoUnidad,
    estado_puertas: input.estadoPuertas,
    estado_paredes_laterales: input.estadoParedesLaterales,
    estado_piso: input.estadoPiso,
    estado_techo: input.estadoTecho,
    estado_sistema_cierre: input.estadoSistemaCierre,
    ausencia_perforaciones_danios_visibles:
      input.ausenciaPerforacionesDaniosVisibles,
    ausencia_elementos_extranos: input.ausenciaElementosExtranos,
    condicion_estructural_apta_para_cargue:
      input.condicionEstructuralAptaParaCargue,
    limpieza_interna_unidad: input.limpiezaInternaUnidad,
    ausencia_residuos: input.ausenciaResiduos,
    ausencia_olores_extranos: input.ausenciaOloresExtranos,
    ausencia_humedad_derrame: input.ausenciaHumedadDerrame,
    ausencia_contaminacion_visible: input.ausenciaContaminacionVisible,
    condicion_apta_para_producto_a_transportar:
      input.condicionAptaParaProductoATransportar,
    resultado_final_inspeccion: input.resultadoFinalInspeccion,
    se_autoriza_para_cargue: input.seAutorizaParaCargue,
    se_detecto_novedad: input.seDetectoNovedad,
    descripcion_novedad: input.descripcionNovedad.trim() || null,
    responsable_inspeccion: input.responsableInspeccion.trim(),
    ...uploadedUrls,
  };

  const data = await saveSingleFormRecordWithClient(
    supabase,
    "reg_fsu02_inspeccion",
    payload,
  );
  await updateOperacionMaestraWithClient(supabase, nombreOperacion, {
    estado_inspeccion: "completo",
  });

  return data;
}

async function uploadFsu02Evidencias(
  supabase: SupabaseClient,
  evidenciasFolder: string,
  nombreOperacion: string,
  evidencias: EvidenciasFsu02Input,
  exigeFotoNovedad: boolean,
) {
  const bucketName =
    process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";

  const entries = Object.entries(evidencias) as Array<[EvidenciaKey, File | null]>;
  const uploaded: Record<string, string | null> = {};

  for (const [key, file] of entries) {
    const config = EVIDENCIAS_CONFIG[key];
    const esOpcional = config.optional && !exigeFotoNovedad;

    if (!file && !esOpcional) {
      throw new Error(`Falta cargar el archivo obligatorio: ${key}.`);
    }

    if (!file && esOpcional) {
      uploaded[config.column] = null;
      continue;
    }

    const extension = getFileExtension(file!.name);
    const path = `${evidenciasFolder}/fsu02/${config.fileName}-${nombreOperacion}.${extension}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, file!, { upsert: true });

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

export function validateFsu02Input(
  input: Fsu02Input,
  evidencias: EvidenciasFsu02Input,
) {
  validateOperationDate(input.fechaInspeccion, "La fecha de inspeccion");
  validatePlate(input.placa);
  validateRequiredText(
    input.numeroRemolqueContenedor,
    "El numero de remolque o contenedor",
  );
  validateOneOf(
    input.resultadoFinalInspeccion,
    RESULTADO_INSPECCION_OPTIONS,
    "El resultado final de la inspeccion",
  );
  validateRequiredText(
    input.responsableInspeccion,
    "El responsable de la inspeccion",
  );
  validateRequiredBoolean(
    input.seAutorizaParaCargue,
    "Se autoriza para cargue",
  );
  validateRequiredBoolean(input.seDetectoNovedad, "Se detecto novedad");

  for (const [label, value] of [
    ["Estado general externo de la unidad", input.estadoGeneralExternoUnidad],
    ["Estado de puertas", input.estadoPuertas],
    ["Estado de paredes laterales", input.estadoParedesLaterales],
    ["Estado del piso", input.estadoPiso],
    ["Estado del techo", input.estadoTecho],
    ["Estado del sistema de cierre", input.estadoSistemaCierre],
    [
      "Ausencia de perforaciones o danos visibles",
      input.ausenciaPerforacionesDaniosVisibles,
    ],
    ["Ausencia de elementos extranos", input.ausenciaElementosExtranos],
    [
      "Condicion estructural apta para cargue",
      input.condicionEstructuralAptaParaCargue,
    ],
    ["Limpieza interna de la unidad", input.limpiezaInternaUnidad],
    ["Ausencia de residuos", input.ausenciaResiduos],
    ["Ausencia de olores extranos", input.ausenciaOloresExtranos],
    ["Ausencia de humedad o derrames", input.ausenciaHumedadDerrame],
    [
      "Ausencia de contaminacion visible",
      input.ausenciaContaminacionVisible,
    ],
    [
      "Condicion apta para el producto a transportar",
      input.condicionAptaParaProductoATransportar,
    ],
  ] as const) {
    validateOneOf(value, CHECK_OPTIONS, label);
  }

  if (input.seDetectoNovedad) {
    validateRequiredText(
      input.descripcionNovedad,
      "La descripcion de la novedad",
    );
  }

  validateImageFile(
    evidencias.fotoLateralExternaUnidad,
    "Foto lateral externa de la unidad",
  );
  validateImageFile(
    evidencias.fotoInteriorVacioUnidadCarga,
    "Foto del interior vacio de la unidad de carga",
  );
  validateImageFile(evidencias.fotoPisoInterno, "Foto del piso interno");
  validateImageFile(evidencias.fotoTechoInterno, "Foto del techo interno");
  validateImageFile(
    evidencias.fotoPuertasSistemaCierre,
    "Foto de puertas o sistema de cierre",
  );
  validateImageFile(
    evidencias.fotoHallazgoNovedad,
    "Foto de hallazgo o novedad",
    !input.seDetectoNovedad,
  );
}
