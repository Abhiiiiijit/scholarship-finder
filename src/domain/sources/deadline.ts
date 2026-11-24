// Reading "last date to apply" off an official page, so a new or extended deadline reaches
// students without anyone retyping it. Deliberately strict: when the page is unclear it answers
// null and the stored deadline stays as it is.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

const DATE_PATTERNS: { re: RegExp; parts: (m: RegExpMatchArray) => [number, number, number] }[] = [
  // 31-10-2026, 31/10/2026, 31.10.2026
  { re: /\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d\d)\b/gi, parts: (m) => [+m[3], +m[2], +m[1]] },
  // 31st October, 2026 / 31 Oct 2026
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH}\\.?,?\\s+(20\\d\\d)\\b`, "gi"), parts: (m) => [+m[3], month(m[2]), +m[1]] },
  // October 31, 2026
  { re: new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)\\b`, "gi"), parts: (m) => [+m[3], month(m[1]), +m[2]] },
];

function month(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

function iso(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (m < 1 || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

function firstDate(text: string): string | null {
  let best: { at: number; value: string } | null = null;
  for (const { re, parts } of DATE_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const value = iso(...parts(m));
      if (value && (best === null || m.index! < best.at)) best = { at: m.index!, value };
    }
  }
  return best?.value ?? null;
}

// The phrase a student's deadline hangs on, and words that mean the date is someone else's.
const CUE = /last\s+date|closing\s+date|deadline|extended\s+(?:up\s*)?to|extended\s+till/gi;
const FOR_STUDENTS = /appl(?:y|ication|icant)|submi(?:t|ssion)|regist(?:er|ration)|fresh|renewal|online/i;
const NOT_STUDENTS = /institut|college|verif|school|district|nodal|ddo|disburs|hard\s*copy/i;
const WINDOW = 180;

// The one application deadline the page states, if it states exactly one, in the next 13 months.
export function findDeadline(pageText: string, today: string): string | null {
  const found = new Set<string>();
  for (const cue of pageText.matchAll(CUE)) {
    const window = pageText.slice(cue.index!, cue.index! + WINDOW);
    const date = firstDate(window);
    if (!date) continue;
    const before = window.slice(0, window.search(/\d/));
    if (!FOR_STUDENTS.test(window) || NOT_STUDENTS.test(before)) continue;
    found.add(date);
  }
  const upcoming = [...found].filter((d) => d >= today && d <= addDays(today, 400));
  return upcoming.length === 1 ? upcoming[0] : null;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
