"use server";

import { redirect } from "next/navigation";

import {
  getAuthorizationFailureMessage,
  isAuthorizedUser,
  normalizeEmail,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Debes ingresar correo y contrasena.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (!isAuthorizedUser(data.user)) {
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
