import { NextResponse } from "next/server";
import { deletePrecintosEmpleado, type PrecintosEmpleadoInput, updatePrecintosEmpleado } from "@/lib/precintos-empleados";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) return errorResponse;
  try { const { id } = await params; return NextResponse.json(await updatePrecintosEmpleado(createAdminClient(), id, await request.json() as PrecintosEmpleadoInput)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible actualizar el empleado." }, { status: 400 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) return errorResponse;
  try { const { id } = await params; return NextResponse.json(await deletePrecintosEmpleado(createAdminClient(), id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible eliminar el empleado." }, { status: 400 }); }
}
