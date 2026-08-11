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
import {
  requireOperacionIngresoWithClient,
  syncOperacionStatusWithClient,
} from "@/lib/operaciones-maestra";
import {
  buildNombreOperacion,
  normalizeOperationDate,
  normalizePlate,
} from "@/lib/operations";
import { getResponsableOptionsWithClient } from "@/lib/responsables";
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
  nombreOperacion?: string;
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
  ordenAseoCabina: boolean | null;
  puertasAjustadasCabina: boolean | null;
  techoCabinaBuenEstado: boolean | null;
  pisoInteriorRemolqueLimpio: boolean | null;
  estadoPuertasFurgon: boolean | null;
  estadoBastidores: boolean | null;
  defensaTrasera: boolean | null;
  parachoquesNeumaticosRines: boolean | null;
  puertasCompartimientosHerramientas: boolean | null;
  cajaBateria: boolean | null;
  cajaFiltroAire: boolean | null;
  tanqueCombustible: boolean | null;
  compartimientoInteriorCabinaDormitorio: boolean | null;
  rompevientosDeflectoresTecho: boolean | null;
  soportesMetalicosCarroceriaFurgon: boolean | null;
  quintaRueda: boolean | null;
  pataMecanicaTrailer: boolean | null;
  areasQuintaRueda: boolean | null;
  ladoDerechoTrailer: boolean | null;
  ladoIzquierdoTrailer: boolean | null;
  llantasParachoquesLucesTrailer: boolean | null;
  placaPatinTrailer: boolean | null;
  puntosAnclajeTrailerContenedor: boolean | null;
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
  options?: { responsableOptions?: string[] },
) {
  validateFsu02Input(input, evidencias);
  const responsableOptions =
    options?.responsableOptions ?? (await getResponsableOptionsWithClient(supabase));
  validateSelectedResponsable(input.responsableInspeccion, responsableOptions);
  const fechaInspeccion = normalizeOperationDate(input.fechaInspeccion);
  const placa = normalizePlate(input.placa);
  const nombreOperacion =
    input.nombreOperacion?.trim() || buildNombreOperacion(placa, fechaInspeccion);

  const operacion = await requireOperacionIngresoWithClient(supabase, {
    placa,
    fecha: fechaInspeccion,
    nombreOperacion,
  });

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
    orden_aseo_cabina: input.ordenAseoCabina,
    puertas_ajustadas_cabina: input.puertasAjustadasCabina,
    techo_cabina_buen_estado: input.techoCabinaBuenEstado,
    piso_interior_remolque_limpio: input.pisoInteriorRemolqueLimpio,
    estado_puertas_furgon: input.estadoPuertasFurgon,
    estado_bastidores: input.estadoBastidores,
    defensa_trasera: input.defensaTrasera,
    parachoques_neumaticos_rines: input.parachoquesNeumaticosRines,
    puertas_compartimientos_herramientas:
      input.puertasCompartimientosHerramientas,
    caja_bateria: input.cajaBateria,
    caja_filtro_aire: input.cajaFiltroAire,
    tanque_combustible: input.tanqueCombustible,
    compartimiento_interior_cabina_dormitorio:
      input.compartimientoInteriorCabinaDormitorio,
    rompevientos_deflectores_techo: input.rompevientosDeflectoresTecho,
    soportes_metalicos_carroceria_furgon:
      input.soportesMetalicosCarroceriaFurgon,
    quinta_rueda: input.quintaRueda,
    pata_mecanica_trailer: input.pataMecanicaTrailer,
    areas_quinta_rueda: input.areasQuintaRueda,
    lado_derecho_trailer: input.ladoDerechoTrailer,
    lado_izquierdo_trailer: input.ladoIzquierdoTrailer,
    llantas_parachoques_luces_trailer: input.llantasParachoquesLucesTrailer,
    placa_patin_trailer: input.placaPatinTrailer,
    puntos_anclaje_trailer_contenedor: input.puntosAnclajeTrailerContenedor,
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
  await syncOperacionStatusWithClient(supabase, nombreOperacion, {
    estado_ingreso: "completo",
    estado_inspeccion: "completo",
  });

  return data;
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
    ["Orden y aseo dentro de la cabina", input.ordenAseoCabina],
    ["Puertas ajustadas", input.puertasAjustadasCabina],
    ["Techo de cabina en buen estado", input.techoCabinaBuenEstado],
    ["Estado del piso e interior del remolque", input.pisoInteriorRemolqueLimpio],
    ["Estado de puertas del furgon", input.estadoPuertasFurgon],
    ["Estado de bastidores", input.estadoBastidores],
    ["Defensa trasera", input.defensaTrasera],
    ["Parachoques, neumaticos y rines", input.parachoquesNeumaticosRines],
    ["Puertas y compartimientos de herramientas", input.puertasCompartimientosHerramientas],
    ["Caja de bateria", input.cajaBateria],
    ["Caja y filtro de aire", input.cajaFiltroAire],
    ["Tanque de combustible", input.tanqueCombustible],
    ["Compartimiento interior de cabina y dormitorio", input.compartimientoInteriorCabinaDormitorio],
    ["Rompevientos, deflectores y techo", input.rompevientosDeflectoresTecho],
    ["Soportes metalicos de carroceria o furgon", input.soportesMetalicosCarroceriaFurgon],
    ["Quinta rueda", input.quintaRueda],
    ["Pata mecanica", input.pataMecanicaTrailer],
    ["Areas de quinta rueda", input.areasQuintaRueda],
    ["Lado derecho del trailer", input.ladoDerechoTrailer],
    ["Lado izquierdo del trailer", input.ladoIzquierdoTrailer],
    ["Llantas, parachoques y luces del trailer", input.llantasParachoquesLucesTrailer],
    ["Placa del patin del trailer", input.placaPatinTrailer],
    ["Puntos de anclaje o seguro del trailer al contenedor", input.puntosAnclajeTrailerContenedor],
  ] as const) {
    validateRequiredBoolean(value, label);
  }

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
