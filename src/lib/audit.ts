import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeOperationDate, normalizePlate } from "@/lib/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type OperacionMaestraAudit = {
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
  ruta_evidencias_folder: string | null;
  created_at?: string;
};

export type AuditDetail = {
  operacion: OperacionMaestraAudit;
  fsu01: Record<string, unknown> | null;
  fsu02: Record<string, unknown> | null;
  fsu03: Record<string, unknown> | null;
  supervision: Record<string, unknown> | null;
  fsu04: Record<string, unknown> | null;
};

export type AuditEvidence = {
  group: "F-SU-01" | "F-SU-02" | "F-SU-03" | "SELLADO" | "F-SU-04";
  key: string;
  label: string;
  url: string;
};

export async function searchOperaciones(filters: {
  placa?: string;
  fecha?: string;
  tipoOperacion?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  return searchOperacionesWithClient(supabase, filters);
}

export async function searchOperacionesWithClient(
  supabase: SupabaseClient,
  filters: {
    placa?: string;
    fecha?: string;
    tipoOperacion?: string;
  },
) {
  let nombresPorTipo: string[] | null = null;

  if (filters.tipoOperacion?.trim()) {
    const { data: ingresos, error: ingresosError } = await supabase
      .from("reg_fsu01_ingreso")
      .select("nombre_operacion")
      .eq("tipo_operacion", filters.tipoOperacion.trim())
      .returns<Array<{ nombre_operacion: string }>>();

    if (ingresosError) {
      throw new Error(
        `No fue posible filtrar por tipo de operacion: ${ingresosError.message}`,
      );
    }

    nombresPorTipo = (ingresos ?? []).map(
      (ingreso) => ingreso.nombre_operacion,
    );

    if (nombresPorTipo.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from("operaciones_maestra")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(30);

  if (filters.placa?.trim()) {
    query = query.eq("placa", normalizePlate(filters.placa));
  }

  if (filters.fecha?.trim()) {
    query = query.eq("fecha", normalizeOperationDate(filters.fecha));
  }

  if (nombresPorTipo) {
    query = query.in("nombre_operacion", nombresPorTipo);
  }

  const { data, error } = await query.returns<OperacionMaestraAudit[]>();

  if (error) {
    throw new Error(`No fue posible consultar operaciones: ${error.message}`);
  }

  return data ?? [];
}

export async function getOperacionAuditDetail(nombreOperacion: string) {
  const supabase = getSupabaseBrowserClient();
  return getOperacionAuditDetailWithClient(supabase, nombreOperacion);
}

export async function getOperacionAuditDetailWithClient(
  supabase: SupabaseClient,
  nombreOperacion: string,
) {
  const [operacionRes, fsu01Res, fsu02Res, fsu03Res, supervisionRes, fsu04Res] = await Promise.all([
    supabase
      .from("operaciones_maestra")
      .select("*")
      .eq("nombre_operacion", nombreOperacion)
      .maybeSingle<OperacionMaestraAudit>(),
    supabase
      .from("reg_fsu01_ingreso")
      .select("*")
      .eq("nombre_operacion", nombreOperacion)
      .maybeSingle<Record<string, unknown>>(),
    supabase
      .from("reg_fsu02_inspeccion")
      .select("*")
      .eq("nombre_operacion", nombreOperacion)
      .maybeSingle<Record<string, unknown>>(),
    supabase
      .from("reg_fsu03_cargue_aseguramiento")
      .select("*")
      .eq("nombre_operacion", nombreOperacion)
      .maybeSingle<Record<string, unknown>>(),
    supabase
      .from("supervisiones_sellado")
      .select("*, supervision_sellado_eventos(*)")
      .eq("nombre_operacion", nombreOperacion)
      .maybeSingle<Record<string, unknown>>(),
    supabase
      .from("reg_fsu04_salida")
      .select("*")
      .eq("nombre_operacion", nombreOperacion)
      .maybeSingle<Record<string, unknown>>(),
  ]);

  if (operacionRes.error) {
    throw new Error(
      `No fue posible cargar la operacion ${nombreOperacion}: ${operacionRes.error.message}`,
    );
  }

  if (!operacionRes.data) {
    throw new Error(`La operacion ${nombreOperacion} no existe.`);
  }

  if (fsu01Res.error) {
    throw new Error(`Error cargando F-SU-01: ${fsu01Res.error.message}`);
  }

  if (fsu02Res.error) {
    throw new Error(`Error cargando F-SU-02: ${fsu02Res.error.message}`);
  }

  if (fsu03Res.error) {
    throw new Error(`Error cargando F-SU-03: ${fsu03Res.error.message}`);
  }

  if (supervisionRes.error) {
    throw new Error(`Error cargando Supervisión de sellado: ${supervisionRes.error.message}`);
  }

  if (fsu04Res.error) {
    throw new Error(`Error cargando F-SU-04: ${fsu04Res.error.message}`);
  }

  return {
    operacion: operacionRes.data,
    fsu01: fsu01Res.data,
    fsu02: fsu02Res.data,
    fsu03: fsu03Res.data,
    supervision: flattenSupervision(supervisionRes.data),
    fsu04: fsu04Res.data,
  } satisfies AuditDetail;
}

function flattenSupervision(record: Record<string, unknown> | null) {
  if (!record) return null;
  const events = Array.isArray(record.supervision_sellado_eventos) ? record.supervision_sellado_eventos as Array<Record<string, unknown>> : [];
  const flattened: Record<string, unknown> = { ...record };
  delete flattened.supervision_sellado_eventos;
  events.sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))).forEach((event,index)=>{
    const prefix=`evento_${index+1}`; flattened[`${prefix}_tipo`]=event.tipo_evento; flattened[`${prefix}_fecha`]=event.created_at; flattened[`${prefix}_instalador`]=`${event.instalador_nombre} · ${event.instalador_cedula}`; flattened[`${prefix}_supervisor`]=`${event.supervisor_nombre} · ${event.supervisor_cedula}`; flattened[`${prefix}_observaciones`]=event.observaciones; flattened[`${prefix}_firma_instalador_url`]=event.firma_instalador_url; flattened[`${prefix}_firma_supervisor_url`]=event.firma_supervisor_url;
    const seals=Array.isArray(event.precintos)?event.precintos as Array<Record<string,unknown>>:[]; seals.forEach((seal,sealIndex)=>{const sealPrefix=`${prefix}_precinto_${sealIndex+1}`; flattened[`${sealPrefix}_tipo`]=seal.tipo; flattened[`${sealPrefix}_numero`]=seal.numero; flattened[`${sealPrefix}_foto_url`]=seal.foto_url;});
  });
  return flattened;
}
