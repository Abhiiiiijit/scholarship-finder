import { describe, expect, it } from "vitest";
import { pathOnly } from "./SiteAnalytics";

describe("pathOnly", () => {
  it("drops query strings and hashes before a page view is sent", () => {
    const sent = pathOnly({ type: "pageview", url: "https://paatra.example/hi/results?income=200000#top" });
    expect(sent).toEqual({ type: "pageview", url: "https://paatra.example/hi/results" });
  });
});
