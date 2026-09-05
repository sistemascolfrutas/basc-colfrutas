import { EmbarquesForm } from "@/components/embarques-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";
export default async function EmbarquesPage() { const { appUser } = await requireAuthorizedPageUser("embarques"); return <EmbarquesForm isAdmin={appUser.role === "admin"} />; }
