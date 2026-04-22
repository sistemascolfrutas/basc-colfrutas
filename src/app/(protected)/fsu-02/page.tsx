import { Fsu02Form } from "@/components/fsu02-form";
import { requireAuthorizedPageUser } from "@/lib/server-auth";

export default async function Fsu02Page() {
  await requireAuthorizedPageUser("fsu02");
  return <Fsu02Form />;
}
