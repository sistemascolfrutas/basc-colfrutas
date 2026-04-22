import type { SupabaseClient } from "@supabase/supabase-js";

export const FSU03_PARTICIPANTS_TABLE = "fsu03_participants";

export type Fsu03ParticipantRecord = {
  id: string;
  nombre: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Fsu03ParticipantRow = Fsu03ParticipantRecord;

export type Fsu03ParticipantInput = {
  nombre: string;
  isActive: boolean;
  sortOrder: number;
};

export function mapFsu03ParticipantRow(
  row: Fsu03ParticipantRow,
): Fsu03ParticipantRecord {
  return {
    ...row,
    nombre: row.nombre.trim(),
  };
}

export function validateFsu03ParticipantInput(input: Fsu03ParticipantInput) {
  const nombre = input.nombre.trim();
  if (nombre.length < 3) {
    throw new Error("El nombre del participante debe tener al menos 3 caracteres.");
  }

  return {
    nombre,
    is_active: Boolean(input.isActive),
    sort_order: Number.isFinite(input.sortOrder)
      ? Math.max(0, Math.trunc(input.sortOrder))
      : 0,
  };
}

export async function listFsu03ParticipantsWithClient(
  supabase: SupabaseClient,
  options?: { onlyActive?: boolean },
) {
  let query = supabase
    .from(FSU03_PARTICIPANTS_TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("nombre", { ascending: true });

  if (options?.onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.returns<Fsu03ParticipantRow[]>();

  if (error) {
    throw new Error(`No fue posible cargar participantes F-SU-03: ${error.message}`);
  }

  return (data ?? []).map(mapFsu03ParticipantRow);
}

export async function getFsu03ParticipantOptionsWithClient(
  supabase: SupabaseClient,
) {
  const participants = await listFsu03ParticipantsWithClient(supabase, {
    onlyActive: true,
  });

  return participants.map((item) => item.nombre);
}

export async function createFsu03ParticipantWithClient(
  supabase: SupabaseClient,
  input: Fsu03ParticipantInput,
) {
  const payload = validateFsu03ParticipantInput(input);

  const existing = await supabase
    .from(FSU03_PARTICIPANTS_TABLE)
    .select("id")
    .ilike("nombre", payload.nombre)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    throw new Error(
      `No fue posible validar el participante F-SU-03: ${existing.error.message}`,
    );
  }

  if (existing.data?.id) {
    throw new Error("Ya existe un participante F-SU-03 con ese nombre.");
  }

  const { data, error } = await supabase
    .from(FSU03_PARTICIPANTS_TABLE)
    .insert(payload)
    .select("*")
    .single<Fsu03ParticipantRow>();

  if (error) {
    throw new Error(`No fue posible crear el participante F-SU-03: ${error.message}`);
  }

  return mapFsu03ParticipantRow(data);
}

export async function updateFsu03ParticipantWithClient(
  supabase: SupabaseClient,
  id: string,
  input: Fsu03ParticipantInput,
) {
  const payload = validateFsu03ParticipantInput(input);

  const existing = await supabase
    .from(FSU03_PARTICIPANTS_TABLE)
    .select("id")
    .ilike("nombre", payload.nombre)
    .neq("id", id)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    throw new Error(
      `No fue posible validar el participante F-SU-03: ${existing.error.message}`,
    );
  }

  if (existing.data?.id) {
    throw new Error("Ya existe otro participante F-SU-03 con ese nombre.");
  }

  const { data, error } = await supabase
    .from(FSU03_PARTICIPANTS_TABLE)
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single<Fsu03ParticipantRow>();

  if (error) {
    throw new Error(
      `No fue posible actualizar el participante F-SU-03: ${error.message}`,
    );
  }

  return mapFsu03ParticipantRow(data);
}

export async function deleteFsu03ParticipantWithClient(
  supabase: SupabaseClient,
  id: string,
) {
  const { error } = await supabase
    .from(FSU03_PARTICIPANTS_TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`No fue posible eliminar el participante F-SU-03: ${error.message}`);
  }

  return { success: true as const };
}
