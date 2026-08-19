import { NextResponse } from "next/server";
import { listPrecintosEmpleados } from "@/lib/precintos-empleados";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse, supabase } = await getAuthorizedServerClient("precintos");
  if (errorResponse || !supabase) return errorResponse;
  try {
    return NextResponse.json(await listPrecintosEmpleados(supabase, true), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar empleados." }, { status: 400 });
  }
}
