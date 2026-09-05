import { NextResponse } from "next/server";

import {
  createFsu04SalidaWithClient,
  type EvidenciasFsu04Input,
  type Fsu04Input,
} from "@/lib/fsu04";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(`api:fsu04:${getClientIp(request.headers)}`, {
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

  const { errorResponse, supabase } = await getAuthorizedServerClient("fsu04");
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const input: Fsu04Input = {
      nombreOperacion: String(formData.get("nombreOperacion") ?? ""),
      tipoOperacion: String(formData.get("tipoOperacion") ?? ""),
      fechaHoraSalida: String(formData.get("fechaHoraSalida") ?? ""),
      placaNumeroContenedor: String(formData.get("placaNumeroContenedor") ?? ""),
      puertasCerradasSellosInstalados: String(
        formData.get("puertasCerradasSellosInstalados") ?? "",
      ) as Fsu04Input["puertasCerradasSellosInstalados"],
      precintoSeguridad: String(formData.get("precintoSeguridad") ?? ""),
      precintoCorrea: String(formData.get("precintoCorrea") ?? ""),
      observaciones: String(formData.get("observaciones") ?? ""),
    };

    const evidencias: EvidenciasFsu04Input = {
      fotoFinalUnidadSalida: getFile(formData, "fotoFinalUnidadSalida"),
      fotoPrecintoCorrea: getFile(formData, "fotoPrecintoCorrea"),
      fotoPrecintoBotella: getFile(formData, "fotoPrecintoBotella"),
      fotoOtroPrecinto: getFile(formData, "fotoOtroPrecinto"),
    };

    const data = await createFsu04SalidaWithClient(supabase, input, evidencias);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible guardar el formulario." },
      { status: 400 },
    );
  }
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}
