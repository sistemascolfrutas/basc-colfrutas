import type { User } from "@supabase/supabase-js";

const AUTHORIZED_EMAILS = new Set(
  (process.env.AUTHORIZED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAuthorizedUser(user: User | null) {
  if (!user?.email) {
    return false;
  }

  if (!user.email_confirmed_at) {
    return false;
  }

  if (AUTHORIZED_EMAILS.size === 0) {
    return true;
  }

  return AUTHORIZED_EMAILS.has(normalizeEmail(user.email));
}

export function getAuthorizationFailureMessage() {
  if (AUTHORIZED_EMAILS.size === 0) {
    return "Tu cuenta no esta habilitada para ingresar.";
  }

  return "Tu correo no esta autorizado para ingresar a esta plataforma.";
}
