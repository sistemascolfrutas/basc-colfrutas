import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/app-users";
import { listPrecintosEmpleados } from "@/lib/precintos-empleados";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { appUser, errorResponse, supabase } = await getAuthorizedServerClient();
  if (errorResponse || !supabase || !appUser) return errorResponse;
  if (!hasPermission(appUser, "precintos") && !hasPermission(appUser, "salida_precintos")) {
    return NextResponse.json({ error: "No tienes permiso para usar los formularios de precintos." }, { status: 403 });
  }
  try {
    return NextResponse.json(await listPrecintosEmpleados(supabase, true), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar empleados." }, { status: 400 });
  }
}
