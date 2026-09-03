import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createMovimientoKit } from "@/lib/trazabilidad-kits";

export async function POST(request: Request) {
  const rate = consumeRateLimit(`api:salida-precintos:${getClientIp(request.headers)}`, { limit: 20, windowMs: 300000 });
  if (!rate.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta nuevamente." }, { status: 429 });
  const { errorResponse, supabase, user } = await getAuthorizedServerClient("salida_precintos");
  if (errorResponse || !supabase || !user) return errorResponse;
  try {
    const form = await request.formData(); const file = (key: string) => { const value = form.get(key); return value instanceof File && value.size ? value : null; };
    const data = await createMovimientoKit(supabase, user.id, "despacho", { embarqueId: String(form.get("embarqueId") ?? ""), observaciones: String(form.get("observaciones") ?? ""), personaUnoNombre: String(form.get("personaUnoNombre") ?? ""), personaUnoCedula: String(form.get("personaUnoCedula") ?? ""), personaDosNombre: String(form.get("personaDosNombre") ?? ""), personaDosCedula: String(form.get("personaDosCedula") ?? ""), foto: file("foto"), firmaUno: file("firmaUno"), firmaDos: file("firmaDos") });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible guardar la salida." }, { status: 400 });
  }
}
