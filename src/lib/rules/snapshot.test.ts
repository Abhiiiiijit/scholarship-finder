import { describe, expect, it } from "vitest";
import { buildSnapshot, type SnapshotInput } from "./snapshot";

const now = new Date("2026-10-24T12:00:00Z");
const rule = {
  group: 1,
  field: "family_income",
  op: "LTE",
  value: 800000,
  quote: "Annual family income up to Rs. 8 lakh",
  sourceUrl: "https://mahadbt.maharashtra.gov.in/",
};
const scheme = (over: Partial<SnapshotInput>): SnapshotInput => ({
  slug: "mh-ebc",
  name: "EBC fee scheme",
  provider: "STATE",
  stateCode: "MH",
  officialUrl: "https://mahadbt.maharashtra.gov.in/",
  amountText: null,
  deadline: null,
  status: "PUBLISHED",
  lastVerifiedAt: new Date("2026-10-01T00:00:00Z"),
  rules: [rule],
  ...over,
});

describe("buildSnapshot", () => {
  it("keeps published schemes verified in the last 90 days", () => {
    const snap = buildSnapshot(
      [
        scheme({}),
        scheme({ slug: "draft", status: "DRAFT" }),
        scheme({ slug: "stale", lastVerifiedAt: new Date("2026-07-25T00:00:00Z") }),
        scheme({ slug: "never", lastVerifiedAt: null }),
      ],
      3,
      now,
    );
    expect(snap.version).toBe(3);
    expect(snap.schemes.map((s) => s.slug)).toEqual(["mh-ebc"]);
    expect(snap.schemes[0].rules[0].ambiguous).toBe(false);
  });

  it("carries the documents list for the scheme page", () => {
    const snap = buildSnapshot([scheme({ documents: ["Fee receipt"], appliesVia: "State portal" })], 1, now);
    expect(snap.schemes[0]).toMatchObject({ documents: ["Fee receipt"], benefitTypes: [], appliesVia: "State portal" });
  });

  it("refuses to publish a rule without a quote", () => {
    expect(() => buildSnapshot([scheme({ rules: [{ ...rule, quote: "" }] })], 1, now)).toThrow();
  });
});
