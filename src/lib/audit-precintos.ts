import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditPrecintoType = "entrada" | "salida";
export type AuditPrecintoKit = { numero: string; foto_url: string };
export type AuditPrecintoRecord = {
  id: string;
  tipo: AuditPrecintoType;
  numero_embarque?: string;
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

  const newRecords = await searchNewTraceability(supabase, tipo);

  const person = filters.persona?.trim().toLocaleLowerCase("es") ?? "";
  const kitNumber = filters.numeroKit?.trim().toLocaleLowerCase("es") ?? "";
  return [...responses.flat(), ...newRecords]
    .filter((record) => !filters.fecha?.trim() || record.fecha === filters.fecha.trim())
    .filter((record) => !person || `${record.empleado_colfrutas_nombre} ${record.empleado_colfrutas_cedula} ${record.empleado_atempi_nombre} ${record.empleado_atempi_cedula}`.toLocaleLowerCase("es").includes(person))
    .filter((record) => !kitNumber || (Array.isArray(record.kits) && record.kits.some((kit) => String(kit.numero ?? "").toLocaleLowerCase("es").includes(kitNumber))))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 100);
}

async function searchNewTraceability(supabase: SupabaseClient, tipo: AuditPrecintoType | "todos") {
  const requests: Array<Promise<AuditPrecintoRecord[]>> = [];
  if (tipo !== "salida") requests.push(readNewMovements(supabase, "precintos_recepciones", "entrada"));
  if (tipo !== "entrada") requests.push(readNewMovements(supabase, "precintos_despachos", "salida"));
  return (await Promise.all(requests)).flat();
}

async function readNewMovements(supabase: SupabaseClient, table: "precintos_recepciones" | "precintos_despachos", tipo: AuditPrecintoType) {
  const { data, error } = await supabase.from(table)
    .select("*, precintos_embarques!inner(numero_embarque, numero_kit)")
    .order("created_at", { ascending: false }).limit(100).returns<Array<Record<string, unknown>>>();
  if (error) throw new Error(`No fue posible consultar la trazabilidad nueva de precintos: ${error.message}`);
  return (data ?? []).map((row) => mapNewMovement(row, tipo));
}

function mapNewMovement(row: Record<string, unknown>, tipo: AuditPrecintoType): AuditPrecintoRecord {
  const embarque = row.precintos_embarques as { numero_embarque?: string; numero_kit?: string } | null;
  const createdAt = String(row.created_at ?? "");
  const { fecha, hora } = bogotaDateTime(createdAt);
  const entrada = tipo === "entrada";
  return {
    id: String(row.id), tipo, numero_embarque: embarque?.numero_embarque ?? "",
    fecha, hora, hora_final: hora,
    accion: entrada ? "Recepción del kit en Portería" : "Salida del kit hacia Logística",
    empleado_colfrutas_nombre: String(entrada ? row.auxiliar_nombre : row.logistica_nombre),
    empleado_colfrutas_cedula: String(entrada ? row.auxiliar_cedula : row.logistica_cedula),
    empleado_colfrutas_cargo: entrada ? "Auxiliar de Comercio" : "Logística",
    empleado_atempi_nombre: String(row.porteria_nombre ?? ""),
    empleado_atempi_cedula: String(row.porteria_cedula ?? ""),
    cantidad_kits: 1,
    kits: [{ numero: embarque?.numero_kit ?? "", foto_url: String(row.foto_url ?? "") }],
    observaciones: row.observaciones ? String(row.observaciones) : null,
    firma_empleado_atempi_url: String(entrada ? row.firma_porteria_url : row.firma_porteria_url),
    firma_empleado_colfrutas_url: String(entrada ? row.firma_auxiliar_url : row.firma_logistica_url),
    created_at: createdAt,
  };
}

function bogotaDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { fecha: `${part("year")}-${part("month")}-${part("day")}`, hora: `${part("hour")}:${part("minute")}:${part("second")}` };
}
