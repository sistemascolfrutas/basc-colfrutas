import type { SupabaseClient } from "@supabase/supabase-js";

export const PRECINTOS_EMPRESAS = ["COLFRUTAS", "ATEMPI"] as const;
export type PrecintosEmpresa = (typeof PRECINTOS_EMPRESAS)[number];

export type PrecintosEmpleado = {
  id: string;
  empresa: PrecintosEmpresa;
  nombre: string;
  cedula: string;
  cargo: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PrecintosEmpleadoInput = {
  empresa: string;
  nombre: string;
  cedula: string;
  cargo?: string;
  isActive: boolean;
};

function validate(input: PrecintosEmpleadoInput) {
  const empresa = input.empresa.trim().toUpperCase();
  const nombre = input.nombre.trim();
  const cedula = input.cedula.trim();
  const cargo = String(input.cargo ?? "").trim();
  if (!PRECINTOS_EMPRESAS.includes(empresa as PrecintosEmpresa)) throw new Error("La empresa no es valida.");
  if (nombre.length < 3) throw new Error("El nombre debe tener al menos 3 caracteres.");
  if (!cedula) throw new Error("La cedula es obligatoria.");
  if (empresa === "COLFRUTAS" && !cargo) throw new Error("El cargo del empleado COLFRUTAS es obligatorio.");
  return { empresa: empresa as PrecintosEmpresa, nombre, cedula, cargo: cargo || null, is_active: Boolean(input.isActive) };
}

export async function listPrecintosEmpleados(supabase: SupabaseClient, onlyActive = false) {
  let query = supabase.from("precintos_empleados").select("*").order("empresa").order("nombre");
  if (onlyActive) query = query.eq("is_active", true);
  const { data, error } = await query.returns<PrecintosEmpleado[]>();
  if (error) throw new Error(`No fue posible cargar empleados: ${error.message}`);
  return data ?? [];
}

export async function createPrecintosEmpleado(supabase: SupabaseClient, input: PrecintosEmpleadoInput) {
  const { data, error } = await supabase.from("precintos_empleados").insert(validate(input)).select("*").single<PrecintosEmpleado>();
  if (error) throw new Error(`No fue posible crear el empleado: ${error.message}`);
  return data;
}

export async function updatePrecintosEmpleado(supabase: SupabaseClient, id: string, input: PrecintosEmpleadoInput) {
  const { data, error } = await supabase.from("precintos_empleados").update({ ...validate(input), updated_at: new Date().toISOString() }).eq("id", id).select("*").single<PrecintosEmpleado>();
  if (error) throw new Error(`No fue posible actualizar el empleado: ${error.message}`);
  return data;
}

export async function deletePrecintosEmpleado(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("precintos_empleados").delete().eq("id", id);
  if (error) throw new Error(`No fue posible eliminar el empleado: ${error.message}`);
  return { success: true as const };
}
