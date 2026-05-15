import { AdminResponsablesPanel } from "@/components/admin-responsables-panel";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function ResponsablesAdminPage() {
  await requireAuthorizedPageUser("user_admin");
  return <AdminResponsablesPanel />;
}
