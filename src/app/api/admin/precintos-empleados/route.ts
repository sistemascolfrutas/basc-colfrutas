import { NextResponse } from "next/server";
import { createPrecintosEmpleado, listPrecintosEmpleados, type PrecintosEmpleadoInput } from "@/lib/precintos-empleados";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) return errorResponse;
  try { return NextResponse.json(await listPrecintosEmpleados(createAdminClient())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible cargar empleados." }, { status: 400 }); }
}

export async function POST(request: Request) {
  const rate = consumeRateLimit(`api:admin-precintos-empleados:${getClientIp(request.headers)}`, { limit: 20, windowMs: 300000 });
  if (!rate.allowed) return NextResponse.json({ error: `Demasiadas solicitudes. Intenta de nuevo en ${rate.retryAfterSeconds} segundos.` }, { status: 429 });
  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) return errorResponse;
  try { return NextResponse.json(await createPrecintosEmpleado(createAdminClient(), await request.json() as PrecintosEmpleadoInput)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible crear el empleado." }, { status: 400 }); }
}
