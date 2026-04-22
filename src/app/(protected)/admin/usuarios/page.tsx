import { AdminUsersPanel } from "@/components/admin-users-panel";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function AdminUsuariosPage() {
  await requireAuthorizedPageUser("user_admin");
  return <AdminUsersPanel />;
}
