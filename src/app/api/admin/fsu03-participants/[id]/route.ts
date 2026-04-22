import { NextResponse } from "next/server";

import {
  deleteFsu03ParticipantWithClient,
  type Fsu03ParticipantInput,
  updateFsu03ParticipantWithClient,
} from "@/lib/fsu03-participants";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  try {
    const { id } = await params;
    const body = (await request.json()) as Fsu03ParticipantInput;
    const data = await updateFsu03ParticipantWithClient(createAdminClient(), id, body);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el participante F-SU-03.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  try {
    const { id } = await params;
    const data = await deleteFsu03ParticipantWithClient(createAdminClient(), id);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible eliminar el participante F-SU-03.",
      },
      { status: 400 },
    );
  }
}
