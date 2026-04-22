"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAppUserByAuthUserWithClient,
  getAuthorizationFailureMessage,
} from "@/lib/app-users";
import { normalizeEmail } from "@/lib/auth";
import { consumeRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const LOGIN_ERROR_MESSAGE = "Credenciales invalidas o usuario no autorizado.";

export async function login(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);

  if (!email || !password) {
    redirect("/login?error=Debes ingresar correo y contrasena.");
  }

  const rateLimit = consumeRateLimit(`login:${clientIp}:${email}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    redirect(
      `/login?error=${encodeURIComponent(
        `Demasiados intentos. Intenta de nuevo en ${rateLimit.retryAfterSeconds} segundos.`,
      )}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(LOGIN_ERROR_MESSAGE)}`);
  }

  const appUser = data.user
    ? await getAppUserByAuthUserWithClient(supabase, data.user)
    : null;

  if (!appUser) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(getAuthorizationFailureMessage())}`,
    );
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
