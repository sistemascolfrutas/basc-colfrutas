import { NextResponse } from "next/server";

import { createFsu03CargueWithClient, type EvidenciasFsu03Input, type Fsu03Input } from "@/lib/fsu03";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(`api:fsu03:${getClientIp(request.headers)}`, {
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
      },
      { status: 429 },
    );
  }

  const { errorResponse, supabase } = await getAuthorizedServerClient("fsu03");
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const input: Fsu03Input = {
      fechaCargue: String(formData.get("fechaCargue") ?? ""),
      placa: String(formData.get("placa") ?? ""),
      seRealizoCargue: parseBoolean(formData.get("seRealizoCargue")),
      observacionesCargue: String(formData.get("observacionesCargue") ?? ""),
      participante1: String(formData.get("participante1") ?? "") as Fsu03Input["participante1"],
      participante2: String(formData.get("participante2") ?? "") as Fsu03Input["participante2"],
      participante3: String(formData.get("participante3") ?? "") as Fsu03Input["participante3"],
    };

    const evidencias: EvidenciasFsu03Input = {
      fotoPomaRemisionCargue: getFile(formData, "fotoPomaRemisionCargue"),
      fotoCargue25: getFile(formData, "fotoCargue25"),
      fotoCargue50: getFile(formData, "fotoCargue50"),
      fotoCargue75: getFile(formData, "fotoCargue75"),
      fotoCargue100: getFile(formData, "fotoCargue100"),
    };

    const data = await createFsu03CargueWithClient(supabase, input, evidencias);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible guardar el formulario." },
      { status: 400 },
    );
  }
}

function parseBoolean(value: FormDataEntryValue | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}
