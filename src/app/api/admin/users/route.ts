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

export async function GET(request: Request) {
  const rateLimit = consumeRateLimit(`api:admin-users:${getClientIp(request.headers)}`, {
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("app_users")
      .select("*")
      .order("created_at", { ascending: true })
      .returns<AppUserRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json((data ?? []).map(mapAppUserRow));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar usuarios.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit(`api:admin-users-create:${getClientIp(request.headers)}`, {
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Demasiadas solicitudes. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.` },
      { status: 429 },
    );
  }

  const { errorResponse } = await getAuthorizedServerClient("user_admin");
  if (errorResponse) {
    return errorResponse;
  }

  try {
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

    const password = String(body.password ?? "").trim();
    if (password.length < 8) {
      throw new Error("La contrasena inicial debe tener al menos 8 caracteres.");
    }

    const adminClient = createAdminClient();
    const authUserResponse = await adminClient.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      password,
      user_metadata: {
        full_name: input.fullName,
        role: input.role,
      },
    });

    if (authUserResponse.error || !authUserResponse.data.user) {
      throw new Error(
        authUserResponse.error?.message || "No fue posible crear la cuenta Auth.",
      );
    }

    const { data, error } = await adminClient
      .from("app_users")
      .insert({
        auth_user_id: authUserResponse.data.user.id,
        email: input.email,
        full_name: input.fullName,
        is_active: input.isActive,
        permissions: input.permissions,
        role: input.role,
      })
      .select("*")
      .single<AppUserRow>();

    if (error) {
      await adminClient.auth.admin.deleteUser(authUserResponse.data.user.id);
      throw new Error(error.message);
    }

    return NextResponse.json(mapAppUserRow(data));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No fue posible crear el usuario.",
      },
      { status: 400 },
    );
  }
}
