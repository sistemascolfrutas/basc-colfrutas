import { NextResponse } from "next/server";

import { searchOperacionesWithClient } from "@/lib/audit";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(`api:audit-search:${getClientIp(request.headers)}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
      },
      { status: 429 },
    );
  }

  const { errorResponse, supabase } = await getAuthorizedServerClient("audit");
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const body = (await request.json()) as { placa?: string; fecha?: string };
    const data = await searchOperacionesWithClient(supabase, body);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible consultar." },
      { status: 400 },
    );
  }
}
