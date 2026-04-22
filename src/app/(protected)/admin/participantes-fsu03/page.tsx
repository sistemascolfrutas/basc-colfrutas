import { AdminFsu03ParticipantsPanel } from "@/components/admin-fsu03-participants-panel";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function AdminFsu03ParticipantsPage() {
  await requireAuthorizedPageUser("user_admin");
  return <AdminFsu03ParticipantsPanel />;
}
