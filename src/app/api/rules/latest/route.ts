import { connection } from "next/server";
import { db } from "@/server/db/client";
import { latestSnapshot } from "@/server/repositories/snapshot-repo";

// The published rules snapshot the student's phone downloads and matches against locally.
export async function GET() {
  await connection();
  const snapshot = await latestSnapshot(db);
  if (!snapshot) return Response.json({ error: "Nothing published yet" }, { status: 404 });
  return Response.json(snapshot, {
    headers: { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400" },
  });
}
