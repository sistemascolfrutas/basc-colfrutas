import { AdminCierreSalidasPanel } from "@/components/admin-cierre-salidas-panel";
import { requireAuthorizedPageUser } from "@/lib/server-auth";
export default async function AdminCierreSalidasPage() { const { appUser } = await requireAuthorizedPageUser("user_admin"); if (appUser.role !== "admin") return null; return <AdminCierreSalidasPanel />; }
