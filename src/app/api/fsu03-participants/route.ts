import { NextResponse } from "next/server";

import { getFsu03ParticipantOptionsWithClient } from "@/lib/fsu03-participants";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(`api:fsu03-participants:${getClientIp(request.headers)}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { errorResponse, supabase } = await getAuthorizedServerClient("fsu03");
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const data = await getFsu03ParticipantOptionsWithClient(
      tryCreateAdminClient() ?? supabase,
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar participantes F-SU-03.",
      },
      { status: 400 },
    );
  }
}
