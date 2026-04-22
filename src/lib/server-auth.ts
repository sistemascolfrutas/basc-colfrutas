import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import {
  type AppPermission,
  getAppUserByAuthUserWithClient,
  getAuthorizationFailureMessage,
  getPermissionFailureMessage,
  hasPermission,
} from "@/lib/app-users";
import { createClient } from "@/lib/supabase/server";

export async function getAuthorizedServerClient(
  requiredPermission?: AppPermission,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: "No autenticado." },
        { status: 401 },
      ),
      supabase: null,
      user: null,
    };
  }

  const appUser = await getAppUserByAuthUserWithClient(supabase, user);

  if (!appUser) {
    await supabase.auth.signOut();

    return {
      appUser: null,
      errorResponse: NextResponse.json(
        { error: getAuthorizationFailureMessage() },
        { status: 403 },
      ),
      supabase: null,
      user: null,
    };
  }

  if (requiredPermission && !hasPermission(appUser, requiredPermission)) {
    return {
      appUser,
      errorResponse: NextResponse.json(
        { error: getPermissionFailureMessage(requiredPermission) },
        { status: 403 },
      ),
      supabase: null,
      user,
    };
  }

  return {
    appUser,
    errorResponse: null,
    supabase,
    user,
  };
}

export async function requireAuthorizedPageUser(
  requiredPermission?: AppPermission,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const appUser = await getAppUserByAuthUserWithClient(supabase, user);
  if (!appUser) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(getAuthorizationFailureMessage())}`,
    );
  }

  if (requiredPermission && !hasPermission(appUser, requiredPermission)) {
    redirect("/");
  }

  return {
    appUser,
    supabase,
    user,
  };
}
