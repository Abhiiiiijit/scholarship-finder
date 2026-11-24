import { describe, expect, it } from "vitest";
import { decideScheme, type PageResult, type WatchedRule, type WatchedSource } from "./decide";
import { normalizeForMatch } from "./page-text";

const now = new Date("2026-11-24T00:30:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const url = "https://example.gov.in/scheme";

const ok = (text: string, hash = "h1"): PageResult => ({ status: "ok", text, normalized: normalizeForMatch(text), hash });
const pageText = "Candidate should be Domicile of Maharashtra State. Income should not be more than 8 Lakhs.";
const source = (baselineHash: string | null = null): WatchedSource => ({ id: 1, url, baselineHash });
const rule = (over: Partial<WatchedRule> = {}): WatchedRule => ({
  id: 10, sourceUrl: url, quote: '"Candidate should be Domicile of Maharashtra State."', quoteFoundAt: null, quoteMissingSince: null, ...over,
});
const scheme = (lastVerifiedAt: Date | null = daysAgo(30), deadline: string | null = null) => ({ officialUrl: url, lastVerifiedAt, deadline });

describe("decideScheme", () => {
  it("re-verifies a scheme whose quotes are all still on the page", () => {
    const d = decideScheme(scheme(), [source()], [rule()], new Map([[url, ok(pageText)]]), now);
    expect(d.refresh).toBe(true);
    expect(d.rules).toEqual([{ id: 10, quoteFoundAt: now, quoteMissingSince: null }]);
  });

  it("re-verifies at most weekly", () => {
    expect(decideScheme(scheme(daysAgo(2)), [source()], [rule()], new Map([[url, ok(pageText)]]), now).refresh).toBe(false);
  });

  it("flags a quote that was seen before and is gone, and does not re-verify", () => {
    const d = decideScheme(scheme(), [source()], [rule({ quoteFoundAt: daysAgo(1) })], new Map([[url, ok("Something else entirely now")]]), now);
    expect(d.refresh).toBe(false);
    expect(d.rules).toEqual([{ id: 10, quoteFoundAt: daysAgo(1), quoteMissingSince: now }]);
  });

  it("leaves a never-seen quote alone, and trusts the page only while it matches the verified baseline", () => {
    const summary = rule({ quote: "Domicile of Maharashtra (summary)" });
    const first = decideScheme(scheme(), [source()], [summary], new Map([[url, ok(pageText, "h1")]]), now);
    expect(first.rules).toEqual([]);
    expect(first.baselines).toEqual([{ sourceId: 1, baselineHash: "h1" }]);
    expect(first.refresh).toBe(true);

    expect(decideScheme(scheme(), [source("h1")], [summary], new Map([[url, ok(pageText, "h1")]]), now).refresh).toBe(true);
    const changed = decideScheme(scheme(), [source("h1")], [summary], new Map([[url, ok(pageText, "h2")]]), now);
    expect(changed.refresh).toBe(false);
    expect(changed.notes.join()).toMatch(/changed since last verified/);
  });

  it("does not set a baseline for a scheme that is already stale", () => {
    const d = decideScheme(scheme(daysAgo(120)), [source()], [rule({ quote: "summary only" })], new Map([[url, ok(pageText)]]), now);
    expect(d.baselines).toEqual([]);
    expect(d.refresh).toBe(false);
  });

  it("changes nothing when the site refuses scripts", () => {
    const d = decideScheme(scheme(), [source()], [rule({ quoteFoundAt: daysAgo(1) })], new Map([[url, { status: "blocked", reason: "403" } as PageResult]]), now);
    expect(d).toMatchObject({ refresh: false, rules: [], baselines: [], deadline: null });
  });

  it("moves the deadline only later", () => {
    const text = `${pageText} Last date to apply online is 31-12-2026.`;
    expect(decideScheme(scheme(daysAgo(30), "2026-11-30"), [source()], [rule()], new Map([[url, ok(text)]]), now).deadline).toBe("2026-12-31");
    expect(decideScheme(scheme(daysAgo(30), "2027-01-31"), [source()], [rule()], new Map([[url, ok(text)]]), now).deadline).toBeNull();
  });
});
