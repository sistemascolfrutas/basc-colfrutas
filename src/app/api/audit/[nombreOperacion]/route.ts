import { NextResponse } from "next/server";

import { getOperacionAuditDetailWithClient } from "@/lib/audit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { signEvidenceUrlsInRecord } from "@/lib/server-evidence";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ nombreOperacion: string }> },
) {
  const { errorResponse, supabase } = await getAuthorizedServerClient();
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
