import { getPendingOperacionesForFormWithClient } from "@/lib/operaciones-maestra";
import { NextResponse } from "next/server";
import { createSignedEvidenceUrl } from "@/lib/server-evidence";
import type { SavedSelladoEvent } from "@/components/sellado-saved-event";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { saveSupervisionSellado, type PrecintoSelladoInput } from "@/lib/supervision-sellado";

export async function GET() {
  const { errorResponse, supabase } = await getAuthorizedServerClient("supervision_sellado");
  if (errorResponse || !supabase) return errorResponse;
  try {
    const operations = await getPendingOperacionesForFormWithClient(supabase, "supervision_sellado");
    const result = [];
    for (const operation of operations) {
      const { data, error } = await supabase.from("supervisiones_sellado")
        .select("*, supervision_sellado_eventos(*)")
        .eq("nombre_operacion", operation.nombre_operacion).maybeSingle();
      if (error) throw new Error(error.message);
      const supervision = data ? {
        ...data,
        supervision_sellado_eventos: await Promise.all(
          ((data.supervision_sellado_eventos ?? []) as SavedSelladoEvent[]).map(async (event) => ({
            ...event,
            firma_instalador_url: await createSignedEvidenceUrl(supabase, event.firma_instalador_url, 3600),
            firma_supervisor_url: await createSignedEvidenceUrl(supabase, event.firma_supervisor_url, 3600),
            precintos: await Promise.all(event.precintos.map(async (seal) => ({
              ...seal,
              foto_url: await createSignedEvidenceUrl(supabase, seal.foto_url, 3600),
            }))),
          })),
        ),
      } : null;
      result.push({ ...operation, supervision });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar operaciones." }, { status: 400 });
  }
}
export async function POST(request:Request){const rate=consumeRateLimit(`api:supervision-sellado:${getClientIp(request.headers)}`,{limit:20,windowMs:300000});if(!rate.allowed)return NextResponse.json({error:"Demasiadas solicitudes."},{status:429});const{errorResponse,supabase,user}=await getAuthorizedServerClient("supervision_sellado");if(errorResponse||!supabase||!user)return errorResponse;
  try{const form=await request.formData();const count=Number(form.get("cantidad"));const file=(key:string)=>{const value=form.get(key);return value instanceof File&&value.size?value:null;};const precintos:PrecintoSelladoInput[]=Array.from({length:count},(_,i)=>({tipo:String(form.get(`tipo${i}`)??"") as PrecintoSelladoInput["tipo"],numero:String(form.get(`numero${i}`)??""),foto:file(`foto${i}`)}));const data=await saveSupervisionSellado(supabase,user.id,{nombreOperacion:String(form.get("nombreOperacion")??""),numeroEmbarque:String(form.get("numeroEmbarque")??""),instaladorId:String(form.get("instaladorId")??""),supervisorId:String(form.get("supervisorId")??""),observaciones:String(form.get("observaciones")??""),finalizar:form.get("accion")==="finalizar"},precintos,{instalador:file("firmaInstalador"),supervisor:file("firmaSupervisor")});return NextResponse.json(data);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No fue posible guardar la supervisión."},{status:400});}}
