import { PrecintosForm } from "@/components/precintos-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function PrecintosPage() {
  await requireAuthorizedPageUser("precintos");
  return <PrecintosForm />;
}
