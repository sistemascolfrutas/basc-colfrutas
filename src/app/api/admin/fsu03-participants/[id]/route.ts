import { NextResponse } from "next/server";

import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export async function PATCH(request: Request) {
  const rateLimit = consumeRateLimit(`api:admin-fsu03-participants-update:${getClientIp(request.headers)}`, {
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) {
    return errorResponse;
  }

  return NextResponse.json(
    {
      error:
        "La gestion de participantes F-SU-03 esta suspendida. Escribelos manualmente en el formulario.",
    },
    { status: 410 },
  );
}

export async function DELETE(request: Request) {
  const rateLimit = consumeRateLimit(`api:admin-fsu03-participants-delete:${getClientIp(request.headers)}`, {
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) {
    return errorResponse;
  }

  return NextResponse.json(
    {
      error:
        "La gestion de participantes F-SU-03 esta suspendida. Escribelos manualmente en el formulario.",
    },
    { status: 410 },
  );
}
