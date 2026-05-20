import { NextResponse } from "next/server";

import { getResponsableOptionsWithClient } from "@/lib/responsables";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(`api:responsables:${getClientIp(request.headers)}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { errorResponse, supabase } = await getAuthorizedServerClient();
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const adminClient = tryCreateAdminClient();
    const data = adminClient
      ? await getResponsableOptionsWithClient(adminClient).catch(() =>
          getResponsableOptionsWithClient(supabase),
        )
      : await getResponsableOptionsWithClient(supabase);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Responsables-Count": String(data.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar responsables.",
      },
      { status: 400 },
    );
  }
}
