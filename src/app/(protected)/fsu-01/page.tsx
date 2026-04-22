import { Fsu01Form } from "@/components/fsu01-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function Fsu01Page() {
  await requireAuthorizedPageUser("fsu01");
  return <Fsu01Form />;
}
