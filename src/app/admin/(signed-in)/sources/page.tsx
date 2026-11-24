import { SourceCheckView } from "@/features/registry";
import { requireAdmin } from "@/server/auth/require-admin";
import { db } from "@/server/db/client";
import { recentRuns, sourceStatus } from "@/server/repositories/source-repo";

export const metadata = { title: "Source check · Admin" };

// "Check all now" reads every official page in one server action; government sites are slow.
export const maxDuration = 300;

export default async function SourceCheck() {
  await requireAdmin();
  const [schemes, runs] = await Promise.all([sourceStatus(db), recentRuns(db, 10)]);
  return <SourceCheckView schemes={schemes} runs={runs} />;
}
