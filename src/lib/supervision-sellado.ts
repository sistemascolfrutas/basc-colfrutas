import type { SupabaseClient } from "@supabase/supabase-js";
import { validateImageFile, validateRequiredText } from "@/lib/form-validation";
import { listPrecintosEmpleados } from "@/lib/precintos-empleados";

export type PrecintoSelladoInput = { tipo: "correa" | "botella" | ""; numero: string; foto: File | null };
export async function saveSupervisionSellado(supabase: SupabaseClient, userId: string, input: { nombreOperacion: string; numeroEmbarque: string; instaladorId: string; supervisorId: string; observaciones: string; finalizar: boolean }, precintos: PrecintoSelladoInput[], firmas: { instalador: File | null; supervisor: File | null }) {
  validateRequiredText(input.nombreOperacion, "La operación"); validateRequiredText(input.numeroEmbarque, "El número de embarque");
  if (precintos.length < 1 || precintos.length > 5) throw new Error("La cantidad de precintos debe estar entre 1 y 5.");
  const empleados = await listPrecintosEmpleados(supabase, true); const instalador = empleados.find((x) => x.id === input.instaladorId && x.empresa === "COLFRUTAS"); const supervisor = empleados.find((x) => x.id === input.supervisorId && x.empresa === "ATEMPI");
  if (!instalador) throw new Error("Selecciona quién instala los precintos."); if (!supervisor) throw new Error("Selecciona quién supervisa la instalación.");
  validateImageFile(firmas.instalador, "Firma de quien instala"); validateImageFile(firmas.supervisor, "Firma de quien supervisa");
  precintos.forEach((p, i) => { if (!p.tipo) throw new Error(`Selecciona el tipo del precinto ${i + 1}.`); validateRequiredText(p.numero, `El número del precinto ${i + 1}`); validateImageFile(p.foto, `Foto del precinto ${i + 1}`); });
  const numeros = precintos.map((p) => p.numero.trim().toUpperCase()); if (new Set(numeros).size !== numeros.length) throw new Error("Los números de precinto no se pueden repetir.");
  const eventId = crypto.randomUUID(); const folder = `supervision-sellado/${input.nombreOperacion}/${eventId}`; const bucket = process.env.NEXT_PUBLIC_SUPABASE_EVIDENCIAS_BUCKET || "evidencias-basc";
  const stored = [] as Array<{ tipo: string; numero: string; foto_url: string }>;
  for (let i=0;i<precintos.length;i+=1) { const p=precintos[i]; const ext=p.foto!.name.split(".").at(-1)?.toLowerCase()||"jpg"; const path=`${folder}/precinto-${i+1}.${ext}`; const {error}=await supabase.storage.from(bucket).upload(path,p.foto!,{upsert:false}); if(error) throw new Error(`No fue posible guardar la foto ${i+1}: ${error.message}`); stored.push({tipo:p.tipo,numero:numeros[i],foto_url:path}); }
  const signaturePaths={instalador:`${folder}/firma-instalador.png`,supervisor:`${folder}/firma-supervisor.png`};
  for (const [path,file] of [[signaturePaths.instalador,firmas.instalador!],[signaturePaths.supervisor,firmas.supervisor!]] as const) { const {error}=await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:"image/png"}); if(error) throw new Error(`No fue posible guardar la firma: ${error.message}`); }
  const {data,error}=await supabase.rpc("guardar_evento_supervision_sellado",{p_nombre_operacion:input.nombreOperacion,p_numero_embarque:input.numeroEmbarque,p_tipo_evento:input.finalizar?"definitivo":"stand_by",p_evento_id:eventId,p_precintos:stored,p_personas:{instalador_id:instalador.id,instalador_nombre:instalador.nombre,instalador_cedula:instalador.cedula,supervisor_id:supervisor.id,supervisor_nombre:supervisor.nombre,supervisor_cedula:supervisor.cedula},p_firmas:signaturePaths,p_observaciones:input.observaciones,p_created_by:userId});
  if(error) throw new Error(error.message); return data;
}
