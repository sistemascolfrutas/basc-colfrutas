import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createEmbarque, listEmbarques, type EstadoEmbarque } from "@/lib/trazabilidad-kits";

export async function GET(request: Request) {
  const { errorResponse, supabase } = await getAuthorizedServerClient();
  if (errorResponse || !supabase) return errorResponse;
  try {
    const value = new URL(request.url).searchParams.get("estado");
    const estados = ["PENDIENTE_RECEPCION", "DISPONIBLE_PORTERIA", "DESPACHADO", "ANULADO"];
    const estado = estados.includes(value ?? "") ? value as EstadoEmbarque : undefined;
    return NextResponse.json(await listEmbarques(supabase, estado));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible consultar embarques." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const rate = consumeRateLimit(`api:embarques:${getClientIp(request.headers)}`, { limit: 30, windowMs: 300000 });
  if (!rate.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta nuevamente." }, { status: 429 });
  const { errorResponse, supabase, user } = await getAuthorizedServerClient("embarques");
  if (errorResponse || !supabase || !user) return errorResponse;
  try {
    const body = await request.json();
    return NextResponse.json(await createEmbarque(supabase, user.id, String(body.numeroEmbarque ?? ""), String(body.numeroKit ?? ""), String(body.observaciones ?? "")));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible crear el embarque." }, { status: 400 });
  }
}
