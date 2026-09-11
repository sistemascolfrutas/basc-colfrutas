"use client";

import { logout } from "@/app/login/actions";
import { AuthSubmitButton } from "@/components/auth-submit-button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <AuthSubmitButton
        label="Cerrar sesion"
        pendingLabel="Cerrando..."
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      />
    </form>
  );
}
