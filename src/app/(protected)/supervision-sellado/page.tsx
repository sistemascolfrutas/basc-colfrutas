import { SupervisionSelladoForm } from "@/components/supervision-sellado-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";
export default async function Page(){await requireAuthorizedPageUser("supervision_sellado");return <SupervisionSelladoForm/>;}
