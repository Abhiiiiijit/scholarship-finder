// Turning an official page into comparable text, and finding a rule's quote in it.
// Pure: the daily source check (src/server/services/source-watch.ts) fetches, this compares.

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: "…", rupee: "₹",
};

// Visible text of an HTML page: scripts, styles, comments and tags go; entities are decoded.
export function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

// For matching only: case, punctuation, quote styles and line breaks never count as a change.
// "Rs.2.50 Lac" and "rs 2 50 lac" compare equal; the words and numbers themselves must match.
export function normalizeForMatch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

// The parts of a stored quote that claim to be the source's own words.
// Quotes are often a short lead-in plus the official words in quotation marks
// ('Family income "up to Rs. 2.50 lakh" from all sources'): only the marked words are checked.
// With no quotation marks the whole quote is taken as verbatim. An ellipsis splits a part in two.
export function quoteSegments(quote: string): string[] {
  const marked = [...quote.matchAll(/["“”]([^"“”]+)["“”]/g)].map((m) => m[1]);
  const parts = marked.length > 0 ? marked : [quote];
  return parts
    .flatMap((p) => p.split(/…|\.\.\./))
    .map(normalizeForMatch)
    // A fragment of one or two words would match almost any page, so it proves nothing.
    .filter((p) => p.split(" ").length >= 3);
}

// Whether every checkable part of the quote is on the page. null = nothing in it can be checked.
export function quoteOnPage(quote: string, normalizedPage: string): boolean | null {
  const segments = quoteSegments(quote);
  if (segments.length === 0) return null;
  const page = ` ${normalizedPage} `;
  return segments.every((s) => page.includes(` ${s} `));
}
