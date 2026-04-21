import { NextResponse } from "next/server";

import {
  getAuthorizationFailureMessage,
  isAuthorizedUser,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function getAuthorizedServerClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "No autenticado." },
        { status: 401 },
      ),
      supabase: null,
      user: null,
    };
  }

  if (!isAuthorizedUser(user)) {
    await supabase.auth.signOut();

    return {
      errorResponse: NextResponse.json(
        { error: getAuthorizationFailureMessage() },
        { status: 403 },
      ),
      supabase: null,
      user: null,
    };
  }

  return {
    errorResponse: null,
    supabase,
    user,
  };
}
