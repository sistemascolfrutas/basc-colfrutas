import { NextResponse } from "next/server";

import { getOperacionAuditDetailWithClient } from "@/lib/audit";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { signEvidenceUrlsInRecord } from "@/lib/server-evidence";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nombreOperacion: string }> },
) {
  const rateLimit = consumeRateLimit(
    `api:audit-detail:${getClientIp(request.headers)}`,
    {
      limit: 120,
      windowMs: 60 * 1000,
    },
  );
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
    const { nombreOperacion } = await params;
    const detail = await getOperacionAuditDetailWithClient(
      supabase,
      decodeURIComponent(nombreOperacion),
    );

    return NextResponse.json({
      ...detail,
      fsu01: await signEvidenceUrlsInRecord(supabase, detail.fsu01),
      fsu02: await signEvidenceUrlsInRecord(supabase, detail.fsu02),
      fsu03: await signEvidenceUrlsInRecord(supabase, detail.fsu03),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar el detalle.",
      },
      { status: 400 },
    );
  }
}
