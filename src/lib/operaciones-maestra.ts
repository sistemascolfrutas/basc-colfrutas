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
  ruta_evidencias_folder: string | null;
};

export type { OperacionMaestraRecord };

export type PendingOperacionForm = "fsu02" | "fsu03" | "fsu04";

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
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha">,
) {
  const nombreOperacion = buildNombreOperacion(input.placa, input.fecha);
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

  if (operacion.estado_ingreso !== "completo") {
    await syncOperacionStatusWithClient(supabase, nombreOperacion, {
      estado_ingreso: "completo",
    });
  }

  return operacion;
}

export async function requireOperacionInspeccionWithClient(
  supabase: SupabaseClient,
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha">,
) {
  const nombreOperacion = buildNombreOperacion(input.placa, input.fecha);
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

  await syncOperacionStatusWithClient(supabase, nombreOperacion, {
    estado_ingreso: "completo",
    estado_inspeccion: "completo",
  });

  return operacion;
}

export async function requireOperacionCargueWithClient(
  supabase: SupabaseClient,
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha">,
) {
  const nombreOperacion = buildNombreOperacion(input.placa, input.fecha);
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

export async function getPendingOperacionesForFormWithClient(
  supabase: SupabaseClient,
  form: PendingOperacionForm,
) {
  if (form === "fsu02") {
    return getPendingFromRecordsWithClient(
      supabase,
      "reg_fsu01_ingreso",
      "reg_fsu02_inspeccion",
      {
        estado_ingreso: "completo",
      },
    );
  }

  if (form === "fsu03") {
    return getPendingFromRecordsWithClient(
      supabase,
      "reg_fsu02_inspeccion",
      "reg_fsu03_cargue_aseguramiento",
      {
        estado_ingreso: "completo",
        estado_inspeccion: "completo",
      },
    );
  }

  return getPendingFromRecordsWithClient(
    supabase,
    "reg_fsu03_cargue_aseguramiento",
    "reg_fsu04_salida",
    {
      estado_ingreso: "completo",
      estado_inspeccion: "completo",
      estado_cargue: "completo",
    },
  );
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

async function getPendingFromRecordsWithClient(
  supabase: SupabaseClient,
  sourceTable: string,
  completedTable: string,
  statusPatch: Parameters<typeof syncOperacionStatusWithClient>[2],
) {
  const { data: sourceRecords, error: sourceError } = await supabase
    .from(sourceTable)
    .select("nombre_operacion")
    .order("created_at", { ascending: false })
    .limit(80)
    .returns<Array<{ nombre_operacion: string }>>();

  if (sourceError) {
    throw new Error(
      `No fue posible consultar ${sourceTable}: ${sourceError.message}`,
    );
  }

  const nombresOperacion = Array.from(
    new Set((sourceRecords ?? []).map((record) => record.nombre_operacion)),
  );

  if (nombresOperacion.length === 0) {
    return [];
  }

  const { data: completedRecords, error: completedError } = await supabase
    .from(completedTable)
    .select("nombre_operacion")
    .in("nombre_operacion", nombresOperacion)
    .returns<Array<{ nombre_operacion: string }>>();

  if (completedError) {
    throw new Error(
      `No fue posible consultar ${completedTable}: ${completedError.message}`,
    );
  }

  const completedNames = new Set(
    (completedRecords ?? []).map((record) => record.nombre_operacion),
  );
  const pendingNames = nombresOperacion.filter((name) => !completedNames.has(name));

  if (pendingNames.length === 0) {
    return [];
  }

  const { data: operaciones, error: operacionesError } = await supabase
    .from("operaciones_maestra")
    .select(
      "id,nombre_operacion,placa,fecha,conductor,empresa_transportadora,estado_ingreso,estado_inspeccion,estado_cargue,estado_salida,ruta_evidencias_folder",
    )
    .in("nombre_operacion", pendingNames)
    .returns<OperacionMaestraRecord[]>();

  if (operacionesError) {
    throw new Error(
      `No fue posible cargar operaciones pendientes: ${operacionesError.message}`,
    );
  }

  await Promise.all(
    pendingNames.map((nombreOperacion) =>
      syncOperacionStatusWithClient(supabase, nombreOperacion, statusPatch),
    ),
  );

  const order = new Map(pendingNames.map((name, index) => [name, index]));
  return (operaciones ?? []).sort(
    (a, b) =>
      (order.get(a.nombre_operacion) ?? 0) -
      (order.get(b.nombre_operacion) ?? 0),
  );
}

async function getExistingFormRecordWithClient(
  supabase: SupabaseClient,
  table: string,
  nombreOperacion: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("nombre_operacion", nombreOperacion)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(
      `No fue posible validar ${table} para ${nombreOperacion}: ${error.message}`,
    );
  }

  return data;
}
