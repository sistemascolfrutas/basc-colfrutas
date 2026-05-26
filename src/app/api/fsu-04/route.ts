import { NextResponse } from "next/server";

import {
  createFsu04SalidaWithClient,
  type EvidenciasFsu04Input,
  type Fsu04Input,
  getOperationDateFromDateTime,
} from "@/lib/fsu04";
import {
  buildSalidaStatusPatch,
  requireOperacionSalidaWithClient,
  syncOperacionStatusWithClient,
} from "@/lib/operaciones-maestra";
import { buildNombreOperacion, normalizePlate } from "@/lib/operations";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

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
      fechaHoraSalida: String(formData.get("fechaHoraSalida") ?? ""),
      placaNumeroContenedor: String(formData.get("placaNumeroContenedor") ?? ""),
      puertasCerradasSellosInstalados: String(
        formData.get("puertasCerradasSellosInstalados") ?? "",
      ) as Fsu04Input["puertasCerradasSellosInstalados"],
      observaciones: String(formData.get("observaciones") ?? ""),
    };

    const evidencias: EvidenciasFsu04Input = {
      fotoFinalUnidadSalida: getFile(formData, "fotoFinalUnidadSalida"),
    };

    const data = await createFsu04SalidaWithClient(supabase, input, evidencias);
    const adminClient = createAdminClient();
    const nombreOperacion =
      input.nombreOperacion?.trim() ||
      buildNombreOperacion(
        normalizePlate(input.placaNumeroContenedor),
        getOperationDateFromDateTime(input.fechaHoraSalida),
      );
    const { requiereFlujoCompleto } =
      await requireOperacionSalidaWithClient(adminClient, {
        placa: normalizePlate(input.placaNumeroContenedor),
        fecha: getOperationDateFromDateTime(input.fechaHoraSalida),
        nombreOperacion,
      });
    await syncOperacionStatusWithClient(
      adminClient,
      nombreOperacion,
      buildSalidaStatusPatch(requiereFlujoCompleto),
    );
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
