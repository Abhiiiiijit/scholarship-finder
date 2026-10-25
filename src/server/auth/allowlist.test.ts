import { describe, expect, it } from "vitest";
import { adminLogins, isAdmin } from "./allowlist";

describe("admin allowlist", () => {
  it("allows only Abhiiiiijit by default", () => {
    expect(adminLogins(undefined)).toEqual(["abhiiiiijit"]);
    expect(isAdmin("Abhiiiiijit", adminLogins(undefined))).toBe(true);
    expect(isAdmin("abhiiiiijit", adminLogins(undefined))).toBe(true);
    expect(isAdmin("someone-else", adminLogins(undefined))).toBe(false);
  });

  it("refuses a missing login", () => {
    expect(isAdmin(undefined)).toBe(false);
    expect(isAdmin("")).toBe(false);
  });

  it("reads a comma-separated override", () => {
    const admins = adminLogins(" Abhiiiiijit, helper ,");
    expect(admins).toEqual(["abhiiiiijit", "helper"]);
    expect(isAdmin("Helper", admins)).toBe(true);
  });

  it("allows nobody when the override is empty", () => {
    expect(isAdmin("Abhiiiiijit", adminLogins(""))).toBe(false);
  });
});
