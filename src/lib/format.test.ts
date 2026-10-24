import { describe, expect, it } from "vitest";
import { daysAgo, formatDate, formatINR, formatLakh, todayInIndia } from "./format";

describe("format", () => {
  it("writes rupees the Indian way", () => {
    expect(formatINR(900000)).toBe("₹9,00,000");
    expect(formatLakh(100000)).toBe("₹1 L");
    expect(formatLakh(450000)).toBe("₹4.5 L");
  });

  it("dates", () => {
    const now = new Date("2026-10-24T20:00:00Z");
    expect(daysAgo(new Date("2026-10-21T20:00:00Z"), now)).toBe("3 days ago");
    expect(daysAgo(null, now)).toBe("never");
    expect(formatDate("2027-03-31")).toBe("31 Mar 2027");
    // 20:00 UTC is already the next day in India.
    expect(todayInIndia(now)).toBe("2026-10-25");
  });
});
