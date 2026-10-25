import { RegistryView } from "@/features/registry";
import { requireAdmin } from "@/server/auth/require-admin";
import { db } from "@/server/db/client";
import { listSchemes } from "@/server/repositories/scheme-repo";

export const metadata = { title: "Registry · Admin" };

export default async function Registry({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const { kind = "", state = "", status = "" } = (await searchParams) as {
    kind?: string;
    state?: string;
    status?: string;
  };
  return <RegistryView schemes={await listSchemes(db)} kind={kind} state={state} status={status} />;
}
