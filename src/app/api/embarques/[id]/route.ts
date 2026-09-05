import { NextResponse } from "next/server";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse, supabase, appUser } = await getAuthorizedServerClient("embarques");
  if (errorResponse || !supabase) return errorResponse;
  if (appUser?.role !== "admin") return NextResponse.json({ error: "Solo el administrador puede eliminar embarques." }, { status: 403 });
  const rate = consumeRateLimit(`api:eliminar-embarque:${getClientIp(request.headers)}`, { limit: 20, windowMs: 300000 });
  if (!rate.allowed) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta nuevamente." }, { status: 429 });
  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "El identificador del embarque no es válido." }, { status: 400 });
    }
    const body = await request.json();
    const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
    if (!motivo || motivo.length > 2000) return NextResponse.json({ error: "Escribe un motivo de entre 1 y 2000 caracteres." }, { status: 400 });
    const { error } = await supabase.rpc("eliminar_embarque_con_motivo", { p_embarque_id: id, p_motivo: motivo });
    if (error) throw new Error(error.message);
    return NextResponse.json({ eliminado: true, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible eliminar el embarque." }, { status: 400 });
  }
}
