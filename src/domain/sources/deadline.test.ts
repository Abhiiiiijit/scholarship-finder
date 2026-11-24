import { describe, expect, it } from "vitest";
import { findDeadline } from "./deadline";

const today = "2026-11-24";

describe("findDeadline", () => {
  it("reads one clear last date to apply", () => {
    expect(findDeadline("Last date for submission of online application is 31-12-2026.", today)).toBe("2026-12-31");
    expect(findDeadline("The last date to apply has been extended to 15th January, 2027.", today)).toBe("2027-01-15");
    expect(findDeadline("Deadline for fresh applications: January 31, 2027", today)).toBe("2027-01-31");
  });

  it("ignores dates meant for institutes", () => {
    expect(findDeadline("Last date for institute verification of applications: 15/01/2027", today)).toBeNull();
  });

  it("gives up when the page states two different deadlines", () => {
    expect(findDeadline("Last date to apply (fresh) 31.12.2026. Last date to apply (renewal) 15.01.2027.", today)).toBeNull();
  });

  it("ignores a past date next to a current one", () => {
    expect(findDeadline("Last date to apply was 31-10-2026, now extended to 30-11-2026 for online applications.", today)).toBe("2026-11-30");
  });

  it("ignores impossible and far-off dates", () => {
    expect(findDeadline("Last date to apply 31-02-2027", today)).toBeNull();
    expect(findDeadline("Last date to apply 31-12-2029", today)).toBeNull();
  });
});
