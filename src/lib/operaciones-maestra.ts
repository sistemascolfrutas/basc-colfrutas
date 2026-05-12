import type { SupabaseClient } from "@supabase/supabase-js";

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

  if (!operacion || operacion.estado_ingreso !== "completo") {
    throw new Error(
      "No encontramos un F-SU-01 registrado con esa placa y fecha. Verifica la placa o corrigela antes de continuar.",
    );
  }

  return operacion;
}

export async function requireOperacionCargueWithClient(
  supabase: SupabaseClient,
  input: Pick<GetOrCreateOperacionInput, "placa" | "fecha">,
) {
  const nombreOperacion = buildNombreOperacion(input.placa, input.fecha);
  const operacion =
    await getOperacionMaestraByNombreOperacionWithClient(supabase, nombreOperacion);

  if (!operacion || operacion.estado_cargue !== "completo") {
    throw new Error(
      "No encontramos un F-SU-03 completo con esa placa y fecha. Verifica la placa o completa el cargue antes de registrar la salida.",
    );
  }

  return operacion;
}

export async function getPendingOperacionesForFormWithClient(
  supabase: SupabaseClient,
  form: PendingOperacionForm,
) {
  let query = supabase
    .from("operaciones_maestra")
    .select(
      "id,nombre_operacion,placa,fecha,conductor,empresa_transportadora,estado_ingreso,estado_inspeccion,estado_cargue,estado_salida,ruta_evidencias_folder",
    )
    .eq("estado_ingreso", "completo")
    .order("fecha", { ascending: false })
    .limit(50);

  if (form === "fsu02") {
    query = query.neq("estado_inspeccion", "completo");
  }

  if (form === "fsu03") {
    query = query
      .eq("estado_inspeccion", "completo")
      .neq("estado_cargue", "completo");
  }

  if (form === "fsu04") {
    query = query
      .eq("estado_cargue", "completo")
      .neq("estado_salida", "completo");
  }

  const { data, error } = await query.returns<OperacionMaestraRecord[]>();

  if (error) {
    throw new Error(`No fue posible cargar operaciones pendientes: ${error.message}`);
  }

  return data ?? [];
}
