import { NextResponse } from "next/server";

import { createFsu01IngresoWithClient, type EvidenciasInput, type Fsu01Input } from "@/lib/fsu01";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export async function POST(request: Request) {
  const { errorResponse, supabase } = await getAuthorizedServerClient();
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const formData = await request.formData();
    const input: Fsu01Input = {
      fechaRegistro: String(formData.get("fechaRegistro") ?? ""),
      horaRegistro: String(formData.get("horaRegistro") ?? ""),
      tipoOperacion: String(formData.get("tipoOperacion") ?? "") as Fsu01Input["tipoOperacion"],
      tipoOperacionOtro: String(formData.get("tipoOperacionOtro") ?? ""),
      placa: String(formData.get("placa") ?? ""),
      tipoVehiculo: String(formData.get("tipoVehiculo") ?? "") as Fsu01Input["tipoVehiculo"],
      empresaTransportadora: String(formData.get("empresaTransportadora") ?? ""),
      origen: String(formData.get("origen") ?? ""),
      destino: String(formData.get("destino") ?? ""),
      nombreConductor: String(formData.get("nombreConductor") ?? ""),
      numeroCedula: String(formData.get("numeroCedula") ?? ""),
      validacionVisualIngreso: parseBoolean(formData.get("validacionVisualIngreso")),
      autorizaIngreso: parseBoolean(formData.get("autorizaIngreso")),
      responsable: String(formData.get("responsable") ?? ""),
      observaciones: String(formData.get("observaciones") ?? ""),
    };

    const evidencias: EvidenciasInput = {
      fotoFrontalVehiculo: getFile(formData, "fotoFrontalVehiculo"),
      fotoPlaca: getFile(formData, "fotoPlaca"),
      fotoParteTraseraPuertas: getFile(formData, "fotoParteTraseraPuertas"),
      fotoInteriorUnidadCarga: getFile(formData, "fotoInteriorUnidadCarga"),
    };

    const data = await createFsu01IngresoWithClient(supabase, input, evidencias);
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
