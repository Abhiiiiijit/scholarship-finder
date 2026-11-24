import { describe, expect, it } from "vitest";
import { htmlToText, normalizeForMatch, quoteOnPage, quoteSegments } from "./page-text";

const page = normalizeForMatch(
  htmlToText(`<html><head><style>.x{}</style><script>var a = "The Total Annual Income";</script></head>
  <body><nav>Home</nav><p>The Total Annual Income of Family / Guardian should not be more than 8&nbsp;Lakhs.</p>
  <li>Candidate should be admitted through<br>Centralized Admission Process (CAP).</li></body></html>`),
);

describe("page text", () => {
  it("keeps visible words only", () => {
    expect(htmlToText("<p>A &amp; B</p><script>x()</script><!-- c -->")).toBe("A & B");
  });

  it("finds a fully quoted rule despite tags, line breaks and punctuation", () => {
    expect(quoteOnPage('"The Total Annual Income of Family / Guardian should not be more than 8 Lakhs."', page)).toBe(true);
    expect(quoteOnPage('"Candidate should be admitted through Centralized Admission Process (CAP)."', page)).toBe(true);
  });

  it("checks only the words in quotation marks", () => {
    expect(quoteSegments('Family income "up to Rs. 2.50 lakh" from all sources')).toEqual(["up to rs 2 50 lakh"]);
    expect(quoteOnPage('Must be "admitted through Centralized Admission Process" in year 1', page)).toBe(true);
  });

  it("notices a changed number", () => {
    expect(quoteOnPage('"should not be more than 6 Lakhs"', page)).toBe(false);
  });

  it("cannot check a quote of one or two words", () => {
    expect(quoteOnPage('"meritorious girl"', page)).toBeNull();
  });

  it("does not match inside a longer number", () => {
    expect(quoteOnPage('"not be more than 8"', normalizeForMatch("not be more than 80 lakhs"))).toBe(false);
  });
});
