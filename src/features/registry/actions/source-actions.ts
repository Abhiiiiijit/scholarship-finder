"use server";

import { z } from "zod";
import { db } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/require-admin";
import { runWatch } from "@/server/services/source-watch";

export type CheckResult = {
  pagesRead: number;
  pagesTotal: number;
  refreshed: number;
  deadlines: number;
  flagged: number;
  unflagged: number;
  snapshotVersion: number | null;
};

const schemeId = z.number().int().positive().optional();

// A04 "Check now": the daily source check, run on demand for every live scheme or just one.
export async function runSourceCheckAction(id?: number): Promise<CheckResult> {
  const { login } = await requireAdmin();
  const only = schemeId.parse(id);
  const s = await runWatch(db, {
    now: new Date(),
    schemeIds: only === undefined ? undefined : [only],
    trigger: "admin",
    triggeredBy: login,
    concurrency: 6,
  });
  return {
    pagesRead: s.pages.filter((p) => p.status === "ok").length,
    pagesTotal: s.pages.length,
    refreshed: s.refreshed.length,
    deadlines: s.deadlines.length,
    flagged: s.flagged.length,
    unflagged: s.unflagged.length,
    snapshotVersion: s.snapshotVersion,
  };
}
