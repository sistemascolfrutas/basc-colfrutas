import { NextResponse } from "next/server";

import { searchOperacionesWithClient } from "@/lib/audit";
import { getAuthorizedServerClient } from "@/lib/server-auth";

export async function POST(request: Request) {
  const { errorResponse, supabase } = await getAuthorizedServerClient();
  if (errorResponse || !supabase) {
    return errorResponse;
  }

  try {
    const body = (await request.json()) as { placa?: string; fecha?: string };
    const data = await searchOperacionesWithClient(supabase, body);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No fue posible consultar." },
      { status: 400 },
    );
  }
}
