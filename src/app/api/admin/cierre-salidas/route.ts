import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const rate = consumeRateLimit(`api:admin-cierre-salidas:${getClientIp(request.headers)}`, { limit: 60, windowMs: 60000 });
  if (!rate.allowed) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  const { appUser, errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) return errorResponse;
  if (appUser?.role !== "admin") return NextResponse.json({ error: "Solo un administrador puede consultar cierres excepcionales." }, { status: 403 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("operaciones_maestra").select("id,nombre_operacion,placa,fecha,conductor,empresa_transportadora,estado_ingreso,estado_inspeccion,estado_cargue,estado_salida").eq("estado_ingreso", "completo").neq("estado_salida", "completo").order("fecha", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const rate = consumeRateLimit(`api:admin-cierre-salidas-post:${getClientIp(request.headers)}`, { limit: 20, windowMs: 300000 });
  if (!rate.allowed) return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  const { appUser, errorResponse, user } = await getAuthorizedServerClient("user_admin");
  if (errorResponse || !user) return errorResponse;
  if (appUser?.role !== "admin") return NextResponse.json({ error: "Solo un administrador puede cerrar una salida." }, { status: 403 });
  try {
    const body = await request.json(); const nombre = String(body.nombreOperacion ?? "").trim();
    if (!nombre) throw new Error("Selecciona una operación.");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("cerrar_salida_administrativamente", { p_nombre_operacion: nombre, p_admin_id: user.id });
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cerrar la salida." }, { status: 400 }); }
}
