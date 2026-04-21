import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function saveSingleFormRecord(
  table: string,
  payload: Record<string, unknown>,
) {
  const supabase = getSupabaseBrowserClient();
  return saveSingleFormRecordWithClient(supabase, table, payload);
}

export async function saveSingleFormRecordWithClient(
  supabase: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
) {
  const nombreOperacion = String(payload.nombre_operacion ?? "");

  const existing = await supabase
    .from(table)
    .select("id")
    .eq("nombre_operacion", nombreOperacion)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    throw new Error(
      `No fue posible consultar ${table} para ${nombreOperacion}: ${existing.error.message}`,
    );
  }

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq("id", existing.data.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`No fue posible actualizar ${table}: ${error.message}`);
    }

    return data;
  }

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`No fue posible guardar ${table}: ${error.message}`);
  }

  return data;
}
