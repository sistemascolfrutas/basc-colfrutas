import { NextResponse } from "next/server";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { saveSupervisionSellado, type PrecintoSelladoInput } from "@/lib/supervision-sellado";

export async function GET() {
  const { errorResponse, supabase } = await getAuthorizedServerClient("supervision_sellado"); if(errorResponse||!supabase) return errorResponse;
  try { const {data:operations,error:operationsError}=await supabase.from("operaciones_maestra").select("id,nombre_operacion,placa,fecha,conductor,empresa_transportadora,estado_ingreso,estado_inspeccion,estado_cargue,estado_salida,estado_sellado").eq("estado_cargue","completo").neq("estado_salida","completo").order("fecha",{ascending:false}); if(operationsError) throw new Error(operationsError.message); const names=(operations??[]).map((x)=>x.nombre_operacion); if(!names.length) return NextResponse.json([]);
    const {data,error}=await supabase.from("supervisiones_sellado").select("*, supervision_sellado_eventos(*)").in("nombre_operacion",names); if(error) throw new Error(error.message);
    const sessions=new Map((data??[]).map((x)=>[x.nombre_operacion,x])); return NextResponse.json(operations.filter((x)=>sessions.get(x.nombre_operacion)?.estado!=="completo").map((x)=>({...x,supervision:sessions.get(x.nombre_operacion)??null})));
  } catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No fue posible cargar operaciones."},{status:400});}
}

export async function POST(request:Request){const rate=consumeRateLimit(`api:supervision-sellado:${getClientIp(request.headers)}`,{limit:20,windowMs:300000});if(!rate.allowed)return NextResponse.json({error:"Demasiadas solicitudes."},{status:429});const{errorResponse,supabase,user}=await getAuthorizedServerClient("supervision_sellado");if(errorResponse||!supabase||!user)return errorResponse;
  try{const form=await request.formData();const count=Number(form.get("cantidad"));const file=(key:string)=>{const value=form.get(key);return value instanceof File&&value.size?value:null;};const precintos:PrecintoSelladoInput[]=Array.from({length:count},(_,i)=>({tipo:String(form.get(`tipo${i}`)??"") as PrecintoSelladoInput["tipo"],numero:String(form.get(`numero${i}`)??""),foto:file(`foto${i}`)}));const data=await saveSupervisionSellado(supabase,user.id,{nombreOperacion:String(form.get("nombreOperacion")??""),numeroEmbarque:String(form.get("numeroEmbarque")??""),instaladorId:String(form.get("instaladorId")??""),supervisorId:String(form.get("supervisorId")??""),observaciones:String(form.get("observaciones")??""),finalizar:form.get("accion")==="finalizar"},precintos,{instalador:file("firmaInstalador"),supervisor:file("firmaSupervisor")});return NextResponse.json(data);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"No fue posible guardar la supervisión."},{status:400});}}
