import { NextResponse } from "next/server";

import {
  getPendingOperacionesForFormWithClient,
  type PendingOperacionForm,
} from "@/lib/operaciones-maestra";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";

const FORM_PERMISSIONS: Record<PendingOperacionForm, "fsu02" | "fsu03" | "fsu04"> = {
  fsu02: "fsu02",
  fsu03: "fsu03",
  fsu04: "fsu04",
};

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(
    `api:operaciones-pendientes:${getClientIp(request.headers)}`,
    {
      limit: 60,
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

  const url = new URL(request.url);
  const form = url.searchParams.get("form") as PendingOperacionForm | null;

  if (!form || !(form in FORM_PERMISSIONS)) {
    return NextResponse.json(
      { error: "Formulario pendiente no valido." },
      { status: 400 },
    );
  }

  const { errorResponse, supabase } = await getAuthorizedServerClient(
    FORM_PERMISSIONS[form],
  );
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const data = await getPendingOperacionesForFormWithClient(supabase, form);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible consultar." },
      { status: 400 },
    );
  }
}
