import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPrecintosAsignacion,
  type PrecintosFirmasInput,
  type PrecintosInput,
  type PrecintosKitInput,
} from "@/lib/precintos";

export const SALIDA_PRECINTOS_ACCION =
  "Asignacion Kit de Seguridad de ATEMPI para custodia de COLFRUTAS Paletizado";

export function createSalidaPrecinto(
  supabase: SupabaseClient,
  userId: string,
  input: PrecintosInput,
  kits: PrecintosKitInput[],
  firmas: PrecintosFirmasInput,
) {
  return createPrecintosAsignacion(supabase, userId, input, kits, firmas, {
    table: "precintos_salidas",
    storageFolder: "salida-precintos",
    action: SALIDA_PRECINTOS_ACCION,
  });
}
