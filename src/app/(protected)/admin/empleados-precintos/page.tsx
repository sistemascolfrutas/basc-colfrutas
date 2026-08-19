import { AdminPrecintosEmpleadosPanel } from "@/components/admin-precintos-empleados-panel";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function EmpleadosPrecintosAdminPage() {
  await requireAuthorizedPageUser("user_admin");
  return <AdminPrecintosEmpleadosPanel />;
}
