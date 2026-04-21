import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import {
  getAuthorizationFailureMessage,
  isAuthorizedUser,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAuthorizedUser(user)) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent(getAuthorizationFailureMessage())}`);
  }

  return <AppShell userEmail={user.email ?? "Usuario"}>{children}</AppShell>;
}
