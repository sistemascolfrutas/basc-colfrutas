import { EmbarquesForm } from "@/components/embarques-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";
export default async function EmbarquesPage() { await requireAuthorizedPageUser("embarques"); return <EmbarquesForm />; }
