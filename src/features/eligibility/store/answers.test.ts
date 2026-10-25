import { describe, expect, it } from "vitest";
import type { Profile } from "@/domain/profile";
import { sanitize, withState } from "./answers";

describe("saved answers", () => {
  it("keeps valid answers and drops the rest", () => {
    expect(sanitize({ family_income: 900000, gender: "robot", year: "1", junk: 1 })).toEqual({ family_income: 900000, year: "1" });
    expect(sanitize("nope")).toEqual({});
  });

  it("clears category and state answers when the state changes", () => {
    const p: Profile = { domicile_state: "MH", category: "open", state: { "MH.cap_admission": "yes" }, family_income: 1 };
    expect(withState(p, "KA")).toEqual({ domicile_state: "KA", family_income: 1 });
    expect(withState(p, "MH")).toBe(p);
  });
});
