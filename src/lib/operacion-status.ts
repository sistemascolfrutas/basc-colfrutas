import type { SupabaseClient } from "@supabase/supabase-js";

import type { OperacionEstado } from "@/lib/operations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type OperacionStatusPatch = Partial<{
  estado_ingreso: OperacionEstado;
  estado_inspeccion: OperacionEstado;
  estado_cargue: OperacionEstado;
  estado_salida: OperacionEstado;
  conductor: string | null;
  empresa_transportadora: string | null;
}>;

export async function updateOperacionMaestra(
  nombreOperacion: string,
  patch: OperacionStatusPatch,
) {
  const supabase = getSupabaseBrowserClient();
  return updateOperacionMaestraWithClient(supabase, nombreOperacion, patch);
}

export async function updateOperacionMaestraWithClient(
  supabase: SupabaseClient,
  nombreOperacion: string,
  patch: OperacionStatusPatch,
) {
  const { error } = await supabase
    .from("operaciones_maestra")
    .update(patch)
    .eq("nombre_operacion", nombreOperacion);

  if (error) {
    throw new Error(
      `No fue posible actualizar la operacion ${nombreOperacion}: ${error.message}`,
    );
  }
}
