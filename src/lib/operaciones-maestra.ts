import type { SupabaseClient } from "@supabase/supabase-js";

import type { OperacionEstado } from "@/lib/operations";
import { buildNombreOperacion, buildOperacionPayload } from "@/lib/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type OperacionMaestraRecord = {
  id: string;
  nombre_operacion: string;
  placa: string;
  fecha: string;
  conductor: string | null;
  empresa_transportadora: string | null;
  estado_ingreso: string;
  estado_inspeccion: string;
  estado_cargue: string;
  estado_salida: string;
  estado_sellado?: string;
  requiere_sellado: boolean;
  ruta_evidencias_folder: string | null;
  tipo_operacion?: string;
};

export type { OperacionMaestraRecord };

export type PendingOperacionForm = "fsu02" | "fsu03" | "fsu04";

const TIPO_OPERACION_CONTINUA_FLUJO = "Transporte de acopio a puerto";

type GetOrCreateOperacionInput = {
  placa: string;
  fecha: string;
  conductor?: string;
  empresaTransportadora?: string;
};

export async function getOperacionMaestraByNombreOperacion(
  nombreOperacion: string,
) {
  const supabase = getSupabaseBrowserClient();
  return getOperacionMaestraByNombreOperacionWithClient(supabase, nombreOperacion);
}

export async function getOperacionMaestraByNombreOperacionWithClient(
  supabase: SupabaseClient,
  nombreOperacion: string,
) {

  const { data, error } = await supabase
    .from("operaciones_maestra")
    .select("*")
    .eq("nombre_operacion", nombreOperacion)
    .maybeSingle<OperacionMaestraRecord>();

  if (error) {
    throw new Error(
      `No fue posible consultar la operacion ${nombreOperacion}: ${error.message}`,
    );
  }

  return data;
}

export async function getOrCreateOperacionMaestra(
  input: GetOrCreateOperacionInput,
) {
  const supabase = getSupabaseBrowserClient();
  return getOrCreateOperacionMaestraWithClient(supabase, input);
}

export async function getOrCreateOperacionMaestraWithClient(
  supabase: SupabaseClient,
  input: GetOrCreateOperacionInput,
) {
  const nombreOperacion = buildNombreOperacion(input.placa, input.fecha);
  const operacionExistente =
    await getOperacionMaestraByNombreOperacionWithClient(supabase, nombreOperacion);

  if (operacionExistente) {
    return {
      data: operacionExistente,
      created: false,
    };
  }

  const payload = buildOperacionPayload(input);

  const { data, error } = await supabase
    .from("operaciones_maestra")
    .insert(payload)
    .select("*")
    .single<OperacionMaestraRecord>();

  if (error) {
    throw new Error(
      `No fue posible crear la operacion ${payload.nombre_operacion}: ${error.message}`,
    );
  }

  return {
    data,
    created: true,
  };
}

export async function requireOperacionIngresoWithClient(
  supabase: SupabaseClient,
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha"> & {
    nombreOperacion?: string;
  },
) {
  const nombreOperacion =
    input.nombreOperacion?.trim() || buildNombreOperacion(input.placa, input.fecha);
  const operacion =
    await getOperacionMaestraByNombreOperacionWithClient(supabase, nombreOperacion);
  const ingreso = await getExistingFormRecordWithClient(
    supabase,
    "reg_fsu01_ingreso",
    nombreOperacion,
  );

  if (!operacion || !ingreso) {
    throw new Error(
      "No encontramos un F-SU-01 registrado con esa placa y fecha. Verifica la placa o corrigela antes de continuar.",
    );
  }

  if (operacion.estado_salida === "completo") {
    throw new Error("Esta operación ya está cerrada. Actualiza la lista de pendientes.");
  }

  if (operacion.estado_ingreso !== "completo") {
    await syncOperacionStatusWithClient(supabase, nombreOperacion, {
      estado_ingreso: "completo",
    });
  }

  if (ingreso.tipo_operacion !== TIPO_OPERACION_CONTINUA_FLUJO) {
    throw new Error(
      `Esta operacion es "${ingreso.tipo_operacion}". Solo las operaciones "${TIPO_OPERACION_CONTINUA_FLUJO}" pueden continuar a F-SU-02, F-SU-03 y F-SU-04.`,
    );
  }

  return operacion;
}

export async function requireOperacionInspeccionWithClient(
  supabase: SupabaseClient,
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha"> & {
    nombreOperacion?: string;
  },
) {
  const nombreOperacion =
    input.nombreOperacion?.trim() || buildNombreOperacion(input.placa, input.fecha);
  const operacion =
    await getOperacionMaestraByNombreOperacionWithClient(supabase, nombreOperacion);
  const inspeccion = await getExistingFormRecordWithClient(
    supabase,
    "reg_fsu02_inspeccion",
    nombreOperacion,
  );

  if (!operacion || !inspeccion) {
    throw new Error(
      "No encontramos un F-SU-02 registrado con esa placa y fecha. Completa la inspeccion antes de continuar.",
    );
  }

  if (operacion.estado_salida === "completo") {
    throw new Error("Esta operación ya está cerrada. Actualiza la lista de pendientes.");
  }

  await syncOperacionStatusWithClient(supabase, nombreOperacion, {
    estado_ingreso: "completo",
    estado_inspeccion: "completo",
  });

  return operacion;
}

export async function requireOperacionCargueWithClient(
  supabase: SupabaseClient,
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha"> & {
    nombreOperacion?: string;
  },
) {
  const nombreOperacion =
    input.nombreOperacion?.trim() || buildNombreOperacion(input.placa, input.fecha);
  const operacion =
    await getOperacionMaestraByNombreOperacionWithClient(supabase, nombreOperacion);
  const cargue = await getExistingFormRecordWithClient(
    supabase,
    "reg_fsu03_cargue_aseguramiento",
    nombreOperacion,
  );

  if (!operacion || !cargue) {
    throw new Error(
      "No encontramos un F-SU-03 completo con esa placa y fecha. Verifica la placa o completa el cargue antes de registrar la salida.",
    );
  }

  await syncOperacionStatusWithClient(supabase, nombreOperacion, {
    estado_ingreso: "completo",
    estado_inspeccion: "completo",
    estado_cargue: "completo",
  });

  return operacion;
}

export async function requireOperacionSalidaWithClient(
  supabase: SupabaseClient,
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha"> & {
    nombreOperacion?: string;
  },
) {
  const nombreOperacion =
    input.nombreOperacion?.trim() || buildNombreOperacion(input.placa, input.fecha);
  const operacion =
    await getOperacionMaestraByNombreOperacionWithClient(supabase, nombreOperacion);
  const ingreso = await getExistingFormRecordWithClient(
    supabase,
    "reg_fsu01_ingreso",
    nombreOperacion,
  );

  if (!operacion || !ingreso) {
    throw new Error(
      "No encontramos un F-SU-01 registrado con esa placa y fecha. Completa el ingreso antes de registrar la salida.",
    );
  }

  const requiereFlujoCompleto =
    ingreso.tipo_operacion === TIPO_OPERACION_CONTINUA_FLUJO;

  const salida = await getExistingFormRecordWithClient(supabase, "reg_fsu04_salida", nombreOperacion);
  if (operacion.estado_salida === "completo" || salida) {
    throw new Error("Esta operación ya tiene salida o cierre administrativo. Actualiza la lista de pendientes.");
  }

  if (requiereFlujoCompleto) {
    const inspeccion = await getExistingFormRecordWithClient(supabase, "reg_fsu02_inspeccion", nombreOperacion);
    const cargue = await getExistingFormRecordWithClient(
      supabase,
      "reg_fsu03_cargue_aseguramiento",
      nombreOperacion,
    );

    if (!inspeccion || !cargue) {
      throw new Error(
        "Esta operacion requiere F-SU-02 y F-SU-03 antes de registrar la salida.",
      );
    }

    if (operacion.requiere_sellado === true) {
      const { data: supervision, error: supervisionError } = await supabase
        .from("supervisiones_sellado")
        .select("id,estado")
        .eq("nombre_operacion", nombreOperacion)
        .eq("estado", "completo")
        .maybeSingle<{ id: string; estado: string }>();
      if (supervisionError) throw new Error(`No fue posible validar la supervisión de sellado: ${supervisionError.message}`);
      if (!supervision) throw new Error("Debes completar la Supervisión de sellado antes de registrar F-SU-04.");
    }

    await syncOperacionStatusWithClient(supabase, nombreOperacion, {
      estado_ingreso: "completo",
      estado_inspeccion: "completo",
      estado_cargue: "completo",
    });
  } else {
    await syncOperacionStatusWithClient(supabase, nombreOperacion, {
      estado_ingreso: "completo",
    });
  }

  return {
    operacion,
    requiereFlujoCompleto,
  };
}

export function buildSalidaStatusPatch(requiereFlujoCompleto: boolean) {
  return requiereFlujoCompleto
    ? {
        estado_ingreso: "completo" as OperacionEstado,
        estado_inspeccion: "completo" as OperacionEstado,
        estado_cargue: "completo" as OperacionEstado,
        estado_salida: "completo" as OperacionEstado,
      }
    : {
        estado_ingreso: "completo" as OperacionEstado,
        estado_salida: "completo" as OperacionEstado,
      };
}

export async function getPendingOperacionesForFormWithClient(
  supabase: SupabaseClient,
  form: PendingOperacionForm | "supervision_sellado",
) {
  const operaciones: OperacionMaestraRecord[] = [];
  // SQL filtra los pendientes antes de paginar; nunca descarga toda la tabla de salidas.
  // Se avanza por las filas recibidas para respetar incluso limites API menores a 100.
  while (true) {
    const { data, error } = await supabase.rpc("listar_operaciones_pendientes", {
      p_form: form,
      p_offset: operaciones.length,
      p_limit: 100,
    }).returns<Array<{ datos: OperacionMaestraRecord }>>();
    if (error) throw new Error(`No fue posible consultar operaciones pendientes: ${error.message}`);
    if (!data?.length) break;
    operaciones.push(...data.map((row) => row.datos));
  }
  return operaciones;
}
export async function syncOperacionStatusWithClient(
  supabase: SupabaseClient,
  nombreOperacion: string,
  patch: Partial<
    Record<
      "estado_ingreso" | "estado_inspeccion" | "estado_cargue" | "estado_salida",
      OperacionEstado
    >
  > & {
    conductor?: string | null;
    empresa_transportadora?: string | null;
  },
) {
  const { error } = await supabase
    .from("operaciones_maestra")
    .update(patch)
    .eq("nombre_operacion", nombreOperacion);

  if (error) {
    throw new Error(
      `No fue posible sincronizar estados de ${nombreOperacion}: ${error.message}`,
    );
  }
}

async function getExistingFormRecordWithClient(
  supabase: SupabaseClient,
  table: string,
  nombreOperacion: string,
) {
  const selectColumns =
    table === "reg_fsu01_ingreso" ? "id,tipo_operacion" : "id";
  const { data, error } = await supabase
    .from(table)
    .select(selectColumns)
    .eq("nombre_operacion", nombreOperacion)
    .maybeSingle<{ id: string; tipo_operacion?: string }>();

  if (error) {
    throw new Error(
      `No fue posible validar ${table} para ${nombreOperacion}: ${error.message}`,
    );
  }

  return data;
}
