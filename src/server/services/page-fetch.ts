import "server-only";
import { createHash } from "node:crypto";
import { extractText, getDocumentProxy } from "unpdf";
import type { PageResult } from "@/domain/sources/decide";
import { htmlToText, normalizeForMatch } from "@/domain/sources/page-text";

// Reads one official page or PDF as text for the daily source check.
// A site that refuses scripts is "blocked", not "changed": the check then leaves its schemes alone.

const BLOCKS_BOTS = new Set([401, 403, 405, 406, 429, 451]);
const MAX_BYTES = 20 * 1024 * 1024;
export const USER_AGENT = "PaatraSourceCheck/1.0 (+https://github.com/Abhiiiiijit/scholarship-finder)";

export function pageResult(text: string): PageResult {
  const normalized = normalizeForMatch(text);
  return { status: "ok", text, normalized, hash: createHash("sha256").update(normalized).digest("hex") };
}

export async function fetchPage(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = 30_000): Promise<PageResult> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/pdf;q=0.9,*/*;q=0.5" },
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return { status: "error", reason: timedOut ? "timed out" : "could not be reached" };
  }
  if (BLOCKS_BOTS.has(res.status)) {
    await res.body?.cancel();
    return { status: "blocked", reason: `refuses automated reads (${res.status})` };
  }
  if (!res.ok) {
    await res.body?.cancel();
    return { status: "error", reason: `answered ${res.status}` };
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return { status: "error", reason: "too large to read" };
  const type = res.headers.get("content-type") ?? "";
  const isPdf = type.includes("pdf") || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  try {
    const text = isPdf ? await pdfText(bytes) : htmlToText(new TextDecoder().decode(bytes));
    // A page that renders in the browser (or a scanned PDF) has no text to compare.
    if (normalizeForMatch(text).length < 200) return { status: "error", reason: "no readable text (scanned or script-rendered)" };
    return pageResult(text);
  } catch {
    return { status: "error", reason: isPdf ? "PDF could not be read" : "page could not be read" };
  }
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
