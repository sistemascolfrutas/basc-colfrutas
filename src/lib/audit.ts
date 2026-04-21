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
  ruta_evidencias_folder: string | null;
  created_at?: string;
};

export type AuditDetail = {
  operacion: OperacionMaestraAudit;
  fsu01: Record<string, unknown> | null;
  fsu02: Record<string, unknown> | null;
  fsu03: Record<string, unknown> | null;
};

export type AuditEvidence = {
  group: "F-SU-01" | "F-SU-02" | "F-SU-03";
  key: string;
  label: string;
  url: string;
};

export async function searchOperaciones(filters: {
  placa?: string;
  fecha?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  return searchOperacionesWithClient(supabase, filters);
}

export async function searchOperacionesWithClient(
  supabase: SupabaseClient,
  filters: {
    placa?: string;
    fecha?: string;
  },
) {
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
  const [operacionRes, fsu01Res, fsu02Res, fsu03Res] = await Promise.all([
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

  return {
    operacion: operacionRes.data,
    fsu01: fsu01Res.data,
    fsu02: fsu02Res.data,
    fsu03: fsu03Res.data,
  } satisfies AuditDetail;
}
