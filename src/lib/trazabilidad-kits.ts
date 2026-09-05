import type { SupabaseClient } from "@supabase/supabase-js";
import { validateImageFile, validateRequiredText } from "@/lib/form-validation";

export type EstadoEmbarque = "PENDIENTE_RECEPCION" | "DISPONIBLE_PORTERIA" | "DESPACHADO" | "ANULADO";
export type EmbarqueKit = {
  id: string; numero_embarque: string; numero_kit: string; estado: EstadoEmbarque;
  observaciones: string | null; created_at: string; updated_at: string;
  precintos_recepciones?: { created_at: string } | { created_at: string }[] | null;
  precintos_despachos?: { created_at: string } | { created_at: string }[] | null;
};

export async function listEmbarques(supabase: SupabaseClient, estado?: EstadoEmbarque) {
  let query = supabase.from("precintos_embarques").select("*, precintos_recepciones(created_at), precintos_despachos(created_at)").is("eliminado_en", null).order("created_at", { ascending: false }).limit(200);
  if (estado) query = query.eq("estado", estado);
  const { data, error } = await query.returns<EmbarqueKit[]>();
  if (error) throw new Error(`No fue posible consultar los embarques: ${error.message}`);
  return data ?? [];
}

export async function createEmbarque(supabase: SupabaseClient, userId: string, numeroEmbarque: string, numeroKit: string, observaciones: string) {
  validateRequiredText(numeroEmbarque, "El numero de embarque");
  validateRequiredText(numeroKit, "El numero de kit");
  const { data, error } = await supabase.from("precintos_embarques").insert({
    numero_embarque: numeroEmbarque.trim().toUpperCase(), numero_kit: numeroKit.trim().toUpperCase(),
    observaciones: observaciones.trim() || null, created_by: userId,
  }).select("*").single();
  if (error?.code === "23505") throw new Error("El numero de embarque o el numero de kit ya esta registrado.");
  if (error) throw new Error(`No fue posible crear el embarque: ${error.message}`);
  return data;
}

type MovimientoInput = {
  embarqueId: string; foto: File | null; observaciones: string;
  personaUnoNombre: string; personaUnoCedula: string; personaDosNombre: string; personaDosCedula: string;
  firmaUno: File | null; firmaDos: File | null;
};

export async function createMovimientoKit(supabase: SupabaseClient, userId: string, tipo: "recepcion" | "despacho", input: MovimientoInput) {
  validateRequiredText(input.embarqueId, "El embarque");
  validateRequiredText(input.personaUnoNombre, tipo === "recepcion" ? "El auxiliar de comercio" : "La persona de porteria");
  validateRequiredText(input.personaUnoCedula, "La cedula de la primera persona");
  validateRequiredText(input.personaDosNombre, tipo === "recepcion" ? "La persona de porteria" : "La persona de logistica");
  validateRequiredText(input.personaDosCedula, "La cedula de la segunda persona");
  validateImageFile(input.foto, "La fotografia del kit");
  validateImageFile(input.firmaUno, "La primera firma");
  validateImageFile(input.firmaDos, "La segunda firma");

  const movementId = crypto.randomUUID();
  const folder = `trazabilidad-kits/${input.embarqueId}/${tipo}-${movementId}`;
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";
  const extension = input.foto!.name.split(".").at(-1)?.toLowerCase() || "jpg";
  const paths = { foto: `${folder}/kit.${extension}`, firmaUno: `${folder}/firma-1.png`, firmaDos: `${folder}/firma-2.png` };
  for (const [path, file] of [[paths.foto, input.foto!], [paths.firmaUno, input.firmaUno!], [paths.firmaDos, input.firmaDos!]] as const) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (error) throw new Error(`No fue posible guardar la evidencia: ${error.message}`);
  }

  const common = { foto_url: paths.foto, observaciones: input.observaciones.trim(), created_by: userId };
  const payload = tipo === "recepcion" ? {
    ...common, auxiliar_nombre: input.personaUnoNombre.trim(), auxiliar_cedula: input.personaUnoCedula.trim(),
    porteria_nombre: input.personaDosNombre.trim(), porteria_cedula: input.personaDosCedula.trim(),
    firma_auxiliar_url: paths.firmaUno, firma_porteria_url: paths.firmaDos,
  } : {
    ...common, porteria_nombre: input.personaUnoNombre.trim(), porteria_cedula: input.personaUnoCedula.trim(),
    logistica_nombre: input.personaDosNombre.trim(), logistica_cedula: input.personaDosCedula.trim(),
    firma_porteria_url: paths.firmaUno, firma_logistica_url: paths.firmaDos,
  };
  const rpc = tipo === "recepcion" ? "confirmar_recepcion_kit" : "confirmar_despacho_kit";
  const { data, error } = await supabase.rpc(rpc, { p_embarque_id: input.embarqueId, p_movimiento: payload });
  if (error) throw new Error(error.message);
  return data;
}
