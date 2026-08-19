import { PrecintosForm } from "@/components/precintos-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function SalidaPrecintosPage() {
  await requireAuthorizedPageUser("salida_precintos");
  return <PrecintosForm mode="salida" />;
}
