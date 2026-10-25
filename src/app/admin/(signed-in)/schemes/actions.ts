"use server";

import { db } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/require-admin";
import { issuesByPath, schemeDraftSchema } from "@/lib/registry/scheme-input";
import { getScheme, saveScheme } from "@/server/repositories/scheme-repo";
import { publishScheme, PublishError, withdrawScheme } from "@/server/services/publish-service";
import { checkOfficialUrl } from "@/server/services/url-check";

export type SaveResult = { ok: true; id: number } | { ok: false; errors: Record<string, string>; message: string };
export type PublishResult = { ok: true; version: number; note?: string } | { ok: false; problems: string[] };

// Postgres unique_violation, e.g. a slug or tracker id already in use.
const isUniqueViolation = (e: unknown) =>
  typeof e === "object" && e !== null && ("code" in e ? e.code : (e as { cause?: { code?: string } }).cause?.code) === "23505";

export async function saveSchemeAction(input: unknown, id?: number): Promise<SaveResult> {
  await requireAdmin();
  const parsed = schemeDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: issuesByPath(parsed.error), message: "Fix the highlighted fields, then save again." };
  }
  try {
    return { ok: true, id: await saveScheme(db, parsed.data, id) };
  } catch (e) {
    if (isUniqueViolation(e)) {
      return { ok: false, errors: {}, message: "Another scheme already uses this slug or tracker id." };
    }
    if (e instanceof Error && /quote or official link/.test(e.message + String((e as { cause?: unknown }).cause))) {
      return {
        ok: false,
        errors: {},
        message: "This scheme is live, so every rule needs a quote and link before you can save. Put it on hold to edit freely.",
      };
    }
    throw e;
  }
}

export async function publishSchemeAction(id: number): Promise<PublishResult> {
  const { login } = await requireAdmin();
  const found = await getScheme(db, id);
  if (!found) return { ok: false, problems: ["This scheme no longer exists."] };
  const url = await checkOfficialUrl(found.scheme.officialUrl);
  if (!url.ok) return { ok: false, problems: [url.reason] };
  try {
    const snapshot = await publishScheme(db, id, login, new Date());
    return { ok: true, version: snapshot.version, note: url.note };
  } catch (e) {
    if (e instanceof PublishError) return { ok: false, problems: e.problems };
    throw e;
  }
}

export async function withdrawSchemeAction(id: number, status: "ON_HOLD" | "RETIRED" | "DRAFT") {
  const { login } = await requireAdmin();
  const snapshot = await withdrawScheme(db, id, status, login, new Date());
  return { version: snapshot.version };
}
