import { NextResponse } from "next/server";

import { createFsu02InspeccionWithClient, type EvidenciasFsu02Input, type Fsu02Input } from "@/lib/fsu02";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(`api:fsu02:${getClientIp(request.headers)}`, {
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

  const { errorResponse, supabase } = await getAuthorizedServerClient("fsu02");
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const input: Fsu02Input = {
      fechaInspeccion: String(formData.get("fechaInspeccion") ?? ""),
      placa: String(formData.get("placa") ?? ""),
      numeroRemolqueContenedor: String(formData.get("numeroRemolqueContenedor") ?? ""),
      estadoGeneralExternoUnidad: String(formData.get("estadoGeneralExternoUnidad") ?? "") as Fsu02Input["estadoGeneralExternoUnidad"],
      estadoPuertas: String(formData.get("estadoPuertas") ?? "") as Fsu02Input["estadoPuertas"],
      estadoParedesLaterales: String(formData.get("estadoParedesLaterales") ?? "") as Fsu02Input["estadoParedesLaterales"],
      estadoPiso: String(formData.get("estadoPiso") ?? "") as Fsu02Input["estadoPiso"],
      estadoTecho: String(formData.get("estadoTecho") ?? "") as Fsu02Input["estadoTecho"],
      estadoSistemaCierre: String(formData.get("estadoSistemaCierre") ?? "") as Fsu02Input["estadoSistemaCierre"],
      ausenciaPerforacionesDaniosVisibles: String(formData.get("ausenciaPerforacionesDaniosVisibles") ?? "") as Fsu02Input["ausenciaPerforacionesDaniosVisibles"],
      ausenciaElementosExtranos: String(formData.get("ausenciaElementosExtranos") ?? "") as Fsu02Input["ausenciaElementosExtranos"],
      condicionEstructuralAptaParaCargue: String(formData.get("condicionEstructuralAptaParaCargue") ?? "") as Fsu02Input["condicionEstructuralAptaParaCargue"],
      limpiezaInternaUnidad: String(formData.get("limpiezaInternaUnidad") ?? "") as Fsu02Input["limpiezaInternaUnidad"],
      ausenciaResiduos: String(formData.get("ausenciaResiduos") ?? "") as Fsu02Input["ausenciaResiduos"],
      ausenciaOloresExtranos: String(formData.get("ausenciaOloresExtranos") ?? "") as Fsu02Input["ausenciaOloresExtranos"],
      ausenciaHumedadDerrame: String(formData.get("ausenciaHumedadDerrame") ?? "") as Fsu02Input["ausenciaHumedadDerrame"],
      ausenciaContaminacionVisible: String(formData.get("ausenciaContaminacionVisible") ?? "") as Fsu02Input["ausenciaContaminacionVisible"],
      condicionAptaParaProductoATransportar: String(formData.get("condicionAptaParaProductoATransportar") ?? "") as Fsu02Input["condicionAptaParaProductoATransportar"],
      resultadoFinalInspeccion: String(formData.get("resultadoFinalInspeccion") ?? "") as Fsu02Input["resultadoFinalInspeccion"],
      seAutorizaParaCargue: parseBoolean(formData.get("seAutorizaParaCargue")),
      seDetectoNovedad: parseBoolean(formData.get("seDetectoNovedad")),
      descripcionNovedad: String(formData.get("descripcionNovedad") ?? ""),
      responsableInspeccion: String(formData.get("responsableInspeccion") ?? ""),
    };

    const evidencias: EvidenciasFsu02Input = {
      fotoLateralExternaUnidad: getFile(formData, "fotoLateralExternaUnidad"),
      fotoInteriorVacioUnidadCarga: getFile(formData, "fotoInteriorVacioUnidadCarga"),
      fotoPisoInterno: getFile(formData, "fotoPisoInterno"),
      fotoTechoInterno: getFile(formData, "fotoTechoInterno"),
      fotoPuertasSistemaCierre: getFile(formData, "fotoPuertasSistemaCierre"),
      fotoHallazgoNovedad: getFile(formData, "fotoHallazgoNovedad"),
    };

    const data = await createFsu02InspeccionWithClient(supabase, input, evidencias);
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
