// "Mark verified and publish" stays disabled until the official URL opens.
// Government sites often refuse automated requests, so a 401/403/405/429 counts as "opens, but
// blocks bots": the admin has just checked the page by hand. A 404, 5xx or no answer does not.
export type UrlCheck = { ok: true; note?: string } | { ok: false; reason: string };

const BLOCKS_BOTS = new Set([401, 403, 405, 429]);

export async function checkOfficialUrl(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10_000,
): Promise<UrlCheck> {
  try {
    const res = await fetchImpl(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "ScholarshipFinderBot/0.1 (+https://github.com/Abhiiiiijit/scholarship-finder)" },
    });
    await res.body?.cancel();
    if (res.ok) return { ok: true };
    if (BLOCKS_BOTS.has(res.status)) {
      return { ok: true, note: `The site answered ${res.status} to an automated check; confirm it opens in a browser` };
    }
    return { ok: false, reason: `The official URL answered ${res.status}` };
  } catch (e) {
    const reason = e instanceof Error && e.name === "TimeoutError" ? "timed out" : "could not be reached";
    return { ok: false, reason: `The official URL ${reason}` };
  }
}
