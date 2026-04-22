import { AuditDashboard } from "@/components/audit-dashboard";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function AuditoriaPage() {
  await requireAuthorizedPageUser("audit");
  return <AuditDashboard />;
}
