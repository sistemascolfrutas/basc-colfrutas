import type { SupabaseClient } from "@supabase/supabase-js";

export const RESPONSABLES_TABLE = "responsables";

export type ResponsableRecord = {
  id: string;
  nombre: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ResponsableInput = {
  nombre: string;
  isActive: boolean;
};

export function mapResponsableRow(row: ResponsableRecord): ResponsableRecord {
  return {
    ...row,
    nombre: row.nombre.trim(),
  };
}

export function validateResponsableInput(input: ResponsableInput) {
  const nombre = String(input.nombre ?? "").trim();

  if (nombre.length < 3) {
    throw new Error("El nombre del responsable debe tener al menos 3 caracteres.");
  }

  return {
    nombre,
    is_active: Boolean(input.isActive),
  };
}

export async function listResponsablesWithClient(
  supabase: SupabaseClient,
  options?: { onlyActive?: boolean },
) {
  let query = supabase
    .from(RESPONSABLES_TABLE)
    .select("*")
    .order("created_at", { ascending: true })
    .order("nombre", { ascending: true });

  if (options?.onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<ResponsableRecord[]>();

  if (error) {
    throw new Error(`No fue posible cargar responsables: ${error.message}`);
  }

  return (data ?? []).map(mapResponsableRow);
}

export async function getResponsableOptionsWithClient(supabase: SupabaseClient) {
  let responsables = await listResponsablesWithClient(supabase, {
    onlyActive: true,
  });

  if (responsables.length === 0) {
    responsables = await listResponsablesWithClient(supabase);
  }

  return responsables.map((item) => item.nombre);
}

export async function createResponsableWithClient(
  supabase: SupabaseClient,
  input: ResponsableInput,
) {
  const payload = validateResponsableInput(input);

  const existing = await supabase
    .from(RESPONSABLES_TABLE)
    .select("id")
    .ilike("nombre", payload.nombre)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    throw new Error(`No fue posible validar el responsable: ${existing.error.message}`);
  }

  if (existing.data?.id) {
    throw new Error("Ya existe un responsable con ese nombre.");
  }

  const { data, error } = await supabase
    .from(RESPONSABLES_TABLE)
    .insert(payload)
    .select("*")
    .single<ResponsableRecord>();

  if (error) {
    throw new Error(`No fue posible crear el responsable: ${error.message}`);
  }

  return mapResponsableRow(data);
}

export async function updateResponsableWithClient(
  supabase: SupabaseClient,
  id: string,
  input: ResponsableInput,
) {
  const payload = validateResponsableInput(input);

  const existing = await supabase
    .from(RESPONSABLES_TABLE)
    .select("id")
    .ilike("nombre", payload.nombre)
    .neq("id", id)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    throw new Error(`No fue posible validar el responsable: ${existing.error.message}`);
  }

  if (existing.data?.id) {
    throw new Error("Ya existe otro responsable con ese nombre.");
  }

  const { data, error } = await supabase
    .from(RESPONSABLES_TABLE)
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single<ResponsableRecord>();

  if (error) {
    throw new Error(`No fue posible actualizar el responsable: ${error.message}`);
  }

  return mapResponsableRow(data);
}

export async function deleteResponsableWithClient(
  supabase: SupabaseClient,
  id: string,
) {
  const { error } = await supabase.from(RESPONSABLES_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(`No fue posible eliminar el responsable: ${error.message}`);
  }

  return { success: true as const };
}
