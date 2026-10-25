import { describe, expect, it } from "vitest";
import { editorFields, fieldLabel, valueLabel } from "./options";
import { publishProblems, schemeDraftSchema } from "./scheme-input";
import { schemeBadge } from "./status";
import { checkOfficialUrl } from "./url-check";

const base = {
  slug: "aicte-pragati",
  name: "AICTE Pragati",
  provider: "AICTE",
  officialUrl: "https://www.aicte-india.org/",
  rules: [{ group: 1, field: "gender", op: "EQ", value: "female" }],
};

describe("schemeDraftSchema", () => {
  it("accepts a draft rule without a quote", () => {
    const d = schemeDraftSchema.parse({ ...base, trackerId: "", deadline: "" });
    expect(d.rules[0]).toMatchObject({ quote: "", sourceUrl: "", ambiguous: false });
    expect([d.trackerId, d.deadline]).toEqual([null, null]);
  });

  it("needs a state for a state scheme and allows its own state keys only", () => {
    expect(schemeDraftSchema.safeParse({ ...base, provider: "STATE" }).success).toBe(false);
    const mh = { ...base, provider: "STATE", stateCode: "MH" };
    expect(schemeDraftSchema.safeParse({ ...mh, rules: [{ group: 1, field: "MH.cap_admission", op: "IS_TRUE", value: true }] }).success).toBe(true);
    expect(schemeDraftSchema.safeParse({ ...mh, rules: [{ group: 1, field: "KA.kea_seat", op: "IS_TRUE", value: true }] }).success).toBe(false);
  });

  it("rejects fields outside the locked list and hidden operators", () => {
    expect(schemeDraftSchema.safeParse({ ...base, rules: [{ group: 1, field: "age", op: "LTE", value: 25 }] }).success).toBe(false);
    expect(schemeDraftSchema.safeParse({ ...base, rules: [{ group: 1, field: "class12_pct", op: "PERCENTILE_GTE", value: 80 }] }).success).toBe(false);
  });
});

describe("publishProblems", () => {
  it("lists every rule still missing a quote or link", () => {
    const d = schemeDraftSchema.parse(base);
    expect(publishProblems(d)).toEqual([
      "Rule 1 (gender): Quote the official wording for this rule",
      "Rule 1 (gender): Link the official page this quote comes from",
    ]);
    const quoted = { ...d, rules: [{ ...d.rules[0], quote: "Girl students", sourceUrl: base.officialUrl }] };
    expect(publishProblems(quoted)).toEqual([]);
    expect(publishProblems({ ...d, rules: [] })).toEqual(["Add at least one rule"]);
  });
});

describe("schemeBadge", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  const today = "2026-10-24";
  const live = { status: "PUBLISHED", lastVerifiedAt: new Date("2026-10-01T00:00:00Z"), deadline: "2027-01-31" };

  it.each([
    ["draft", { ...live, status: "DRAFT" }],
    ["live", live],
    ["recheck", { ...live, deadline: "2026-11-20" }],
    ["closed", { ...live, deadline: "2026-10-23" }],
    ["stale", { ...live, lastVerifiedAt: new Date("2026-07-01T00:00:00Z") }],
    ["onHold", { ...live, status: "ON_HOLD" }],
    ["retired", { ...live, status: "RETIRED" }],
  ])("%s", (badge, s) => {
    expect(schemeBadge(s, today, now)).toBe(badge);
  });
});

describe("editorFields", () => {
  it("adds the state's own keys and category list", () => {
    const mh = editorFields("MH");
    expect(mh.map((f) => f.key)).toContain("MH.cap_admission");
    expect(mh.find((f) => f.key === "category")?.options.map((o) => o.value)).toContain("vjnt");
    expect(editorFields(null).some((f) => f.key.includes("."))).toBe(false);
  });
});

describe("checkOfficialUrl", () => {
  const fake = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;

  it("passes a page that opens", async () => {
    expect(await checkOfficialUrl("https://x.gov.in/", fake(200))).toEqual({ ok: true });
  });
  it("passes with a note when the site blocks bots", async () => {
    expect((await checkOfficialUrl("https://x.gov.in/", fake(403))).ok).toBe(true);
  });
  it("fails a missing page or an unreachable site", async () => {
    expect(await checkOfficialUrl("https://x.gov.in/", fake(404))).toEqual({ ok: false, reason: "The official URL answered 404" });
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await checkOfficialUrl("https://x.gov.in/", down)).toEqual({ ok: false, reason: "The official URL could not be reached" });
  });
});

describe("display labels", () => {
  it("shows people a label instead of the stored key", () => {
    expect(fieldLabel("family_income")).toBe("Annual family income");
    expect(fieldLabel("MH.cap_admission")).toBe("MH: Admitted through CAP");
    expect(fieldLabel("unknown_key")).toBe("unknown_key");
    expect(valueLabel("year", ["1", "2_lateral"])).toBe("1st year, 2nd year (lateral entry)");
    expect(valueLabel("institution_type", "govt")).toBe("Government");
    expect(valueLabel("category", "vjnt", "MH")).toBe("VJNT");
    expect(valueLabel("DL.delhi_univ", "iiitd")).toBe("IIIT-Delhi");
  });
});
