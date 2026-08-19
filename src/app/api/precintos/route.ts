import { NextResponse } from "next/server";
import { createPrecintosAsignacion, type PrecintosKitInput } from "@/lib/precintos";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export async function POST(request: Request) {
  const rate = consumeRateLimit(`api:precintos:${getClientIp(request.headers)}`, { limit: 20, windowMs: 300000 });
  if (!rate.allowed) return NextResponse.json({ error: `Demasiadas solicitudes. Intenta de nuevo en ${rate.retryAfterSeconds} segundos.` }, { status: 429 });
  const { errorResponse, supabase, user } = await getAuthorizedServerClient("precintos");
  if (errorResponse || !supabase || !user) return errorResponse;
  try {
    const formData = await request.formData();
    const cantidadKits = Number(formData.get("cantidadKits"));
    const kits: PrecintosKitInput[] = Array.from({ length: cantidadKits }, (_, index) => {
      const value = formData.get(`fotoKit${index}`);
      return { numero: String(formData.get(`numeroKit${index}`) ?? ""), foto: value instanceof File && value.size > 0 ? value : null };
    });
    const data = await createPrecintosAsignacion(supabase, user.id, {
      empleadoColfrutasId: String(formData.get("empleadoColfrutasId") ?? ""),
      empleadoAtempiId: String(formData.get("empleadoAtempiId") ?? ""),
      cantidadKits,
      observaciones: String(formData.get("observaciones") ?? ""),
    }, kits, {
      firmaEmpleadoAtempi: getFile(formData, "firmaEmpleadoAtempi"),
      firmaEmpleadoColfrutas: getFile(formData, "firmaEmpleadoColfrutas"),
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible guardar la asignacion." }, { status: 400 });
  }
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}
