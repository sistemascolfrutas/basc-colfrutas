import { Fsu04Form } from "@/components/fsu04-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function Fsu04Page() {
  await requireAuthorizedPageUser("fsu04");
  return <Fsu04Form />;
}
