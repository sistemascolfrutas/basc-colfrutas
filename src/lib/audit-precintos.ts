import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditPrecintoType = "entrada" | "salida";
export type AuditPrecintoKit = { numero: string; foto_url: string };
export type AuditPrecintoRecord = {
  id: string;
  tipo: AuditPrecintoType;
  fecha: string;
  hora: string;
  accion: string;
  empleado_colfrutas_nombre: string;
  empleado_colfrutas_cedula: string;
  empleado_colfrutas_cargo: string;
  empleado_atempi_nombre: string;
  empleado_atempi_cedula: string;
  cantidad_kits: number;
  kits: AuditPrecintoKit[];
  observaciones: string | null;
  firma_empleado_atempi_url: string;
  hora_final: string;
  firma_empleado_colfrutas_url: string;
  created_at: string;
};

export type AuditPrecintoFilters = {
  tipo?: string;
  fecha?: string;
  persona?: string;
  numeroKit?: string;
};

export async function searchAuditPrecintos(
  supabase: SupabaseClient,
  filters: AuditPrecintoFilters,
) {
  const tipo = filters.tipo === "entrada" || filters.tipo === "salida" ? filters.tipo : "todos";
  const tables: Array<{ table: string; tipo: AuditPrecintoType }> = [];
  if (tipo !== "salida") tables.push({ table: "precintos_asignaciones", tipo: "entrada" });
  if (tipo !== "entrada") tables.push({ table: "precintos_salidas", tipo: "salida" });

  const responses = await Promise.all(tables.map(async ({ table, tipo: recordType }) => {
    let query = supabase.from(table).select("*").order("created_at", { ascending: false }).limit(100);
    if (filters.fecha?.trim()) query = query.eq("fecha", filters.fecha.trim());
    const { data, error } = await query.returns<Array<Record<string, unknown>>>();
    if (error) throw new Error(`No fue posible consultar ${recordType === "entrada" ? "entradas" : "salidas"} de precintos: ${error.message}`);
    return (data ?? []).map((record) => ({ ...record, tipo: recordType } as unknown as AuditPrecintoRecord));
  }));

  const person = filters.persona?.trim().toLocaleLowerCase("es") ?? "";
  const kitNumber = filters.numeroKit?.trim().toLocaleLowerCase("es") ?? "";
  return responses.flat()
    .filter((record) => !person || `${record.empleado_colfrutas_nombre} ${record.empleado_colfrutas_cedula} ${record.empleado_atempi_nombre} ${record.empleado_atempi_cedula}`.toLocaleLowerCase("es").includes(person))
    .filter((record) => !kitNumber || (Array.isArray(record.kits) && record.kits.some((kit) => String(kit.numero ?? "").toLocaleLowerCase("es").includes(kitNumber))))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 100);
}
