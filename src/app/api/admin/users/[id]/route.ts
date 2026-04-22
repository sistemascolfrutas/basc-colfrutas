import { NextResponse } from "next/server";

import {
  mapAppUserRow,
  validateAppUserInput,
} from "@/lib/app-users";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { getAuthorizedServerClient } from "@/lib/server-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type AppUserRow = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string | null;
  role: string;
  permissions: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = consumeRateLimit(`api:admin-users-update:${getClientIp(request.headers)}`, {
    limit: 30,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { appUser, errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse || !appUser) {
    return errorResponse;
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      email: string;
      fullName: string;
      role: string;
      permissions: string[];
      isActive: boolean;
      password?: string;
    };

    const input = validateAppUserInput({
      email: body.email,
      fullName: body.fullName,
      role: body.role,
      permissions: body.permissions,
      isActive: body.isActive,
    });

    if (appUser.id === id && (!input.isActive || input.role !== "admin")) {
      throw new Error("No puedes desactivar tu propio acceso administrativo.");
    }

    const adminClient = createAdminClient();
    const existingResponse = await adminClient
      .from("app_users")
      .select("*")
      .eq("id", id)
      .maybeSingle<AppUserRow>();

    if (existingResponse.error) {
      throw new Error(existingResponse.error.message);
    }

    if (!existingResponse.data) {
      throw new Error("El usuario que intentas editar no existe.");
    }

    const password = String(body.password ?? "").trim();
    if (password && password.length < 8) {
      throw new Error("La contrasena debe tener al menos 8 caracteres.");
    }

    if (existingResponse.data.auth_user_id) {
      const authUpdate = await adminClient.auth.admin.updateUserById(
        existingResponse.data.auth_user_id,
        {
          email: input.email,
          password: password || undefined,
          user_metadata: {
            full_name: input.fullName,
            role: input.role,
          },
        },
      );

      if (authUpdate.error) {
        throw new Error(authUpdate.error.message);
      }
    }

    const { data, error } = await adminClient
      .from("app_users")
      .update({
        email: input.email,
        full_name: input.fullName,
        is_active: input.isActive,
        permissions: input.permissions,
        role: input.role,
      })
      .eq("id", id)
      .select("*")
      .single<AppUserRow>();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(mapAppUserRow(data));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible actualizar el usuario.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rateLimit = consumeRateLimit(`api:admin-users-delete:${getClientIp(request.headers)}`, {
    limit: 15,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { appUser, errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse || !appUser) {
    return errorResponse;
  }

  try {
    const { id } = await params;
    if (appUser.id === id) {
      throw new Error("No puedes eliminar tu propio usuario.");
    }

    const adminClient = createAdminClient();
    const existingResponse = await adminClient
      .from("app_users")
      .select("*")
      .eq("id", id)
      .maybeSingle<AppUserRow>();

    if (existingResponse.error) {
      throw new Error(existingResponse.error.message);
    }

    if (!existingResponse.data) {
      throw new Error("El usuario que intentas eliminar no existe.");
    }

    if (existingResponse.data.auth_user_id) {
      const authDelete = await adminClient.auth.admin.deleteUser(
        existingResponse.data.auth_user_id,
      );

      if (authDelete.error) {
        throw new Error(authDelete.error.message);
      }
    }

    const { error } = await adminClient.from("app_users").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible eliminar el usuario.",
      },
      { status: 400 },
    );
  }
}
