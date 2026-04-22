import { Fsu03Form } from "@/components/fsu03-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function Fsu03Page() {
  await requireAuthorizedPageUser("fsu03");
  return <Fsu03Form />;
}
