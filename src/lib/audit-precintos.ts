import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditPrecintoType = "entrada" | "salida" | "trazabilidad";
export type AuditPrecintoKit = { numero: string; foto_url: string };
export type AuditMovimientoKit = {
  created_at: string; foto_url: string; observaciones: string | null;
  persona_uno_nombre: string; persona_uno_cedula: string; persona_dos_nombre: string; persona_dos_cedula: string;
  firma_uno_url: string; firma_dos_url: string;
};
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
  entrada?: AuditMovimientoKit | null;
  salida?: AuditMovimientoKit | null;
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

async function searchNewTraceability(supabase: SupabaseClient, tipo: "entrada" | "salida" | "todos") {
  const { data, error } = await supabase.from("precintos_embarques")
    .select("*, precintos_recepciones(*), precintos_despachos(*)")
    .order("created_at", { ascending: false }).limit(100).returns<Array<Record<string, unknown>>>();
  if (error) throw new Error(`No fue posible consultar la trazabilidad nueva de precintos: ${error.message}`);
  return (data ?? []).map(mapNewTraceability).filter((record) =>
    tipo === "todos" || (tipo === "entrada" ? Boolean(record.entrada) : Boolean(record.salida))
  );
}

function mapNewTraceability(row: Record<string, unknown>): AuditPrecintoRecord {
  const createdAt = String(row.created_at ?? "");
  const { fecha, hora } = bogotaDateTime(createdAt);
  const reception = relation(row.precintos_recepciones);
  const dispatch = relation(row.precintos_despachos);
  const entrada = reception ? mapMovement(reception, true) : null;
  const salida = dispatch ? mapMovement(dispatch, false) : null;
  return {
    id: String(row.id), tipo: "trazabilidad", numero_embarque: String(row.numero_embarque ?? ""),
    fecha, hora, hora_final: hora,
    accion: "Trazabilidad completa del embarque",
    empleado_colfrutas_nombre: entrada?.persona_uno_nombre ?? salida?.persona_dos_nombre ?? "Pendiente",
    empleado_colfrutas_cedula: entrada?.persona_uno_cedula ?? salida?.persona_dos_cedula ?? "",
    empleado_colfrutas_cargo: "Auxiliar de Comercio / Logística",
    empleado_atempi_nombre: entrada?.persona_dos_nombre ?? salida?.persona_uno_nombre ?? "Pendiente",
    empleado_atempi_cedula: entrada?.persona_dos_cedula ?? salida?.persona_uno_cedula ?? "",
    cantidad_kits: 1,
    kits: [{ numero: String(row.numero_kit ?? ""), foto_url: entrada?.foto_url ?? salida?.foto_url ?? "" }],
    observaciones: row.observaciones ? String(row.observaciones) : null,
    firma_empleado_atempi_url: "", firma_empleado_colfrutas_url: "", created_at: createdAt,
    entrada, salida,
  };
}

function relation(value: unknown) { return (Array.isArray(value) ? value[0] : value) as Record<string, unknown> | null | undefined; }
function mapMovement(row: Record<string, unknown>, entrada: boolean): AuditMovimientoKit {
  return { created_at: String(row.created_at ?? ""), foto_url: String(row.foto_url ?? ""), observaciones: row.observaciones ? String(row.observaciones) : null,
    persona_uno_nombre: String(entrada ? row.auxiliar_nombre : row.porteria_nombre), persona_uno_cedula: String(entrada ? row.auxiliar_cedula : row.porteria_cedula),
    persona_dos_nombre: String(entrada ? row.porteria_nombre : row.logistica_nombre), persona_dos_cedula: String(entrada ? row.porteria_cedula : row.logistica_cedula),
    firma_uno_url: String(entrada ? row.firma_auxiliar_url : row.firma_porteria_url), firma_dos_url: String(entrada ? row.firma_porteria_url : row.firma_logistica_url) };
}

function bogotaDateTime(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { fecha: `${part("year")}-${part("month")}-${part("day")}`, hora: `${part("hour")}:${part("minute")}:${part("second")}` };
}
