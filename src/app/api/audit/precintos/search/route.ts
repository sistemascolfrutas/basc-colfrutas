import { NextResponse } from "next/server";
import { searchAuditPrecintos, type AuditPrecintoFilters, type AuditPrecintoRecord } from "@/lib/audit-precintos";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createSignedEvidenceUrl } from "@/lib/server-evidence";

export async function POST(request: Request) {
  const rate = consumeRateLimit(`api:audit-precintos:${getClientIp(request.headers)}`, { limit: 60, windowMs: 60000 });
  if (!rate.allowed) return NextResponse.json({ error: `Demasiadas solicitudes. Intenta de nuevo en ${rate.retryAfterSeconds} segundos.` }, { status: 429 });
  const { errorResponse, supabase } = await getAuthorizedServerClient("audit");
  if (errorResponse || !supabase) return errorResponse;
  try {
    const records = await searchAuditPrecintos(supabase, await request.json() as AuditPrecintoFilters);
    return NextResponse.json(await Promise.all(records.map((record) => signRecord(supabase, record))));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible consultar precintos." }, { status: 400 });
  }
}

async function signRecord(supabase: NonNullable<Awaited<ReturnType<typeof getAuthorizedServerClient>>["supabase"]>, record: AuditPrecintoRecord) {
  const signed = { ...record, kits: Array.isArray(record.kits) ? await Promise.all(record.kits.map(async (kit) => ({ ...kit, foto_url: await createSignedEvidenceUrl(supabase, kit.foto_url) }))) : [] };
  if (record.firma_empleado_atempi_url) signed.firma_empleado_atempi_url = await createSignedEvidenceUrl(supabase, record.firma_empleado_atempi_url);
  if (record.firma_empleado_colfrutas_url) signed.firma_empleado_colfrutas_url = await createSignedEvidenceUrl(supabase, record.firma_empleado_colfrutas_url);
  return signed;
}
