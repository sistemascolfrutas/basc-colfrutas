import { AppShell } from "@/components/app-shell";
import {
  ROLE_LABELS,
  hasPermission,
} from "@/lib/app-users";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/fsu-01", label: "F-SU-01", permission: "fsu01" as const },
  { href: "/fsu-02", label: "F-SU-02", permission: "fsu02" as const },
  { href: "/fsu-03", label: "F-SU-03", permission: "fsu03" as const },
  { href: "/auditoria", label: "Auditoria", permission: "audit" as const },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    permission: "user_admin" as const,
  },
];

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appUser, user } = await requireAuthorizedPageUser();
  const visibleNavItems = navItems.filter(
    (item) => !item.permission || hasPermission(appUser, item.permission),
  );

  return (
    <AppShell
      navItems={visibleNavItems}
      userEmail={user.email ?? "Usuario"}
      userName={appUser.full_name ?? null}
      userRole={ROLE_LABELS[appUser.role]}
    >
      {children}
    </AppShell>
  );
}
