import { NextResponse } from "next/server";

import {
  createFsu03ParticipantWithClient,
  listFsu03ParticipantsWithClient,
  type Fsu03ParticipantInput,
} from "@/lib/fsu03-participants";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(`api:admin-fsu03-participants:${getClientIp(request.headers)}`, {
    limit: 60,
    windowMs: 60 * 1000,
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
    const data = await listFsu03ParticipantsWithClient(createAdminClient());
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

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(`api:admin-fsu03-participants-create:${getClientIp(request.headers)}`, {
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
    const body = (await request.json()) as Fsu03ParticipantInput;
    const data = await createFsu03ParticipantWithClient(createAdminClient(), body);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible crear el participante F-SU-03.",
      },
      { status: 400 },
    );
  }
}
