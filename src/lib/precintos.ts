import type { SupabaseClient } from "@supabase/supabase-js";
import { validateImageFile, validateRequiredText } from "@/lib/form-validation";
import { listPrecintosEmpleados } from "@/lib/precintos-empleados";

export const PRECINTOS_ACCION = "Asignacion de Kit Seguridad por parte de COLFRUTAS";

export type PrecintosInput = { empleadoColfrutasId: string; empleadoAtempiId: string; cantidadKits: number; observaciones: string };
export type PrecintosKitInput = { numero: string; foto: File | null };
export type PrecintosFirmasInput = { firmaEmpleadoAtempi: File | null; firmaEmpleadoColfrutas: File | null };

export async function createPrecintosAsignacion(
  supabase: SupabaseClient,
  userId: string,
  input: PrecintosInput,
  kits: PrecintosKitInput[],
  firmas: PrecintosFirmasInput,
  config: { table?: string; storageFolder?: string; action?: string } = {},
) {
  const table = config.table ?? "precintos_asignaciones";
  const storageFolder = config.storageFolder ?? "precintos";
  const action = config.action ?? PRECINTOS_ACCION;
  const cantidad = Number(input.cantidadKits);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 4) throw new Error("La cantidad de kits debe estar entre 1 y 4.");
  if (kits.length !== cantidad) throw new Error("Debes completar la informacion de cada kit.");

  const empleados = await listPrecintosEmpleados(supabase, true);
  const colfrutas = empleados.find((item) => item.id === input.empleadoColfrutasId && item.empresa === "COLFRUTAS");
  const atempi = empleados.find((item) => item.id === input.empleadoAtempiId && item.empresa === "ATEMPI");
  if (!colfrutas) throw new Error("Selecciona un empleado activo de COLFRUTAS.");
  if (!atempi) throw new Error("Selecciona un empleado activo de ATEMPI.");
  if (!colfrutas.cargo) throw new Error("El empleado COLFRUTAS seleccionado no tiene cargo configurado.");
  validateImageFile(firmas.firmaEmpleadoAtempi, "Firma del empleado ATEMPI que entrega");
  validateImageFile(firmas.firmaEmpleadoColfrutas, "Firma del empleado COLFRUTAS que recibe");

  kits.forEach((kit, index) => {
    validateRequiredText(kit.numero, `El numero del kit ${index + 1}`);
    validateImageFile(kit.foto, `Fotografia del kit ${index + 1}`);
  });
  const normalizedNumbers = kits.map((kit) => kit.numero.trim().toUpperCase());
  if (new Set(normalizedNumbers).size !== normalizedNumbers.length) throw new Error("Los numeros de kit no se pueden repetir.");

  const assignmentId = crypto.randomUUID();
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";
  const storedKits: Array<{ numero: string; foto_url: string }> = [];
  for (let index = 0; index < kits.length; index += 1) {
    const kit = kits[index];
    const extension = kit.foto!.name.split(".").at(-1)?.toLowerCase() || "jpg";
    const path = `${storageFolder}/${assignmentId}/kit-${index + 1}.${extension}`;
    const { error } = await supabase.storage.from(bucket).upload(path, kit.foto!, { upsert: false });
    if (error) throw new Error(`No fue posible subir la fotografia del kit ${index + 1}: ${error.message}`);
    storedKits.push({ numero: normalizedNumbers[index], foto_url: path });
  }

  const signaturePaths = {
    firma_empleado_atempi_url: `${storageFolder}/${assignmentId}/firma-empleado-atempi.png`,
    firma_empleado_colfrutas_url: `${storageFolder}/${assignmentId}/firma-empleado-colfrutas.png`,
  };
  const signatureFiles = {
    firma_empleado_atempi_url: firmas.firmaEmpleadoAtempi!,
    firma_empleado_colfrutas_url: firmas.firmaEmpleadoColfrutas!,
  };
  for (const column of Object.keys(signatureFiles) as Array<keyof typeof signatureFiles>) {
    const { error } = await supabase.storage.from(bucket).upload(signaturePaths[column], signatureFiles[column], { upsert: false, contentType: "image/png" });
    if (error) throw new Error(`No fue posible guardar la firma: ${error.message}`);
  }

  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const { data, error } = await supabase.from(table).insert({
    id: assignmentId,
    fecha: dateFormatter.format(now),
    hora: timeFormatter.format(now),
    accion: action,
    empleado_colfrutas_id: colfrutas.id,
    empleado_colfrutas_nombre: colfrutas.nombre,
    empleado_colfrutas_cedula: colfrutas.cedula,
    empleado_colfrutas_cargo: colfrutas.cargo,
    empleado_atempi_id: atempi.id,
    empleado_atempi_nombre: atempi.nombre,
    empleado_atempi_cedula: atempi.cedula,
    cantidad_kits: cantidad,
    kits: storedKits,
    observaciones: input.observaciones.trim() || null,
    firma_empleado_atempi_url: signaturePaths.firma_empleado_atempi_url,
    hora_final: timeFormatter.format(new Date()),
    firma_empleado_colfrutas_url: signaturePaths.firma_empleado_colfrutas_url,
    created_by: userId,
  }).select("*").single();
  if (error) throw new Error(`No fue posible guardar la asignacion: ${error.message}`);
  return data;
}
