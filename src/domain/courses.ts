// The course catalogue: what a student can be studying, and the level, stream and tags Paatra
// derives from it so a rule can say "any post-matric course" or "any medical course" without the
// student answering three questions. Plan: "Paatra beyond B.E./B.Tech: course model plan".
//
// Like STATES and OTHER_STATES, `live` marks the courses whose schemes are verified. Only
// B.E./B.Tech is live; the rest are here so rules can name them before they open (migration step 5).
// School (Class 9–12) is left out on purpose: it is a separate product.

export const COURSE_LEVELS = ["diploma", "ug", "pg", "doctoral"] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const STREAMS = [
  "engineering",
  "medical",
  "dental",
  "ayush",
  "nursing",
  "pharmacy",
  "architecture",
  "law",
  "management",
  "computer_apps",
  "arts_science_commerce",
  "agriculture",
  "any",
] as const;
export type Stream = (typeof STREAMS)[number];

// Paatra's own groupings that cut across streams. When a scheme lists its own courses ("professional
// courses as notified by the state"), use a `course` IN rule with that list rather than a tag.
export const COURSE_TAGS = ["professional", "technical"] as const;
export type CourseTag = (typeof COURSE_TAGS)[number];

// Only regulators whose approval scholarship rules commonly name. A course without one has none.
export const REGULATORS = ["AICTE", "NMC", "DCI", "NCISM", "INC", "PCI", "COA", "BCI"] as const;
export type Regulator = (typeof REGULATORS)[number];

export interface CourseConfig {
  code: string;
  label: string;
  level: CourseLevel;
  stream: Stream;
  // Highest year a student can be in; lateral entry joins in year 2.
  years: number;
  lateral?: boolean;
  // A compulsory internship year after the final exam (MBBS, BDS, BAMS).
  internship?: boolean;
  regulator?: Regulator;
  tags: CourseTag[];
  live: boolean;
}

const P: CourseTag[] = ["professional"];
const PT: CourseTag[] = ["professional", "technical"];

export const COURSES = [
  // Diploma
  { code: "diploma_engg", label: "Diploma in engineering (polytechnic)", level: "diploma", stream: "engineering", years: 3, lateral: true, regulator: "AICTE", tags: ["technical"], live: false },
  { code: "d_pharm", label: "D.Pharm", level: "diploma", stream: "pharmacy", years: 2, regulator: "PCI", tags: [], live: false },
  { code: "iti", label: "ITI", level: "diploma", stream: "engineering", years: 2, tags: ["technical"], live: false },
  // Undergraduate. B.E./B.Tech allows a 5th year for dual-degree programmes, as the MVP always has.
  { code: "be_btech", label: "B.E. / B.Tech", level: "ug", stream: "engineering", years: 5, lateral: true, regulator: "AICTE", tags: PT, live: true },
  { code: "mbbs", label: "MBBS", level: "ug", stream: "medical", years: 5, internship: true, regulator: "NMC", tags: P, live: false },
  { code: "bds", label: "BDS", level: "ug", stream: "dental", years: 5, internship: true, regulator: "DCI", tags: P, live: false },
  { code: "bams", label: "BAMS / BUMS / BSMS", level: "ug", stream: "ayush", years: 5, internship: true, regulator: "NCISM", tags: P, live: false },
  { code: "bsc_nursing", label: "B.Sc Nursing", level: "ug", stream: "nursing", years: 4, regulator: "INC", tags: P, live: false },
  { code: "b_pharm", label: "B.Pharm", level: "ug", stream: "pharmacy", years: 4, lateral: true, regulator: "PCI", tags: P, live: false },
  { code: "b_arch", label: "B.Arch", level: "ug", stream: "architecture", years: 5, regulator: "COA", tags: PT, live: false },
  { code: "llb_5yr", label: "Integrated LLB (5 years)", level: "ug", stream: "law", years: 5, regulator: "BCI", tags: P, live: false },
  { code: "bba", label: "BBA / BMS", level: "ug", stream: "management", years: 3, tags: [], live: false },
  { code: "bca", label: "BCA", level: "ug", stream: "computer_apps", years: 3, tags: [], live: false },
  { code: "ba", label: "B.A.", level: "ug", stream: "arts_science_commerce", years: 3, tags: [], live: false },
  { code: "bsc", label: "B.Sc", level: "ug", stream: "arts_science_commerce", years: 3, tags: [], live: false },
  { code: "bcom", label: "B.Com", level: "ug", stream: "arts_science_commerce", years: 3, tags: [], live: false },
  { code: "bsc_agri", label: "B.Sc Agriculture", level: "ug", stream: "agriculture", years: 4, tags: P, live: false },
  // Postgraduate and doctoral
  { code: "me_mtech", label: "M.E. / M.Tech", level: "pg", stream: "engineering", years: 2, regulator: "AICTE", tags: PT, live: false },
  { code: "md_ms", label: "MD / MS", level: "pg", stream: "medical", years: 3, regulator: "NMC", tags: P, live: false },
  { code: "mba", label: "MBA / PGDM", level: "pg", stream: "management", years: 2, regulator: "AICTE", tags: P, live: false },
  { code: "mca", label: "MCA", level: "pg", stream: "computer_apps", years: 2, regulator: "AICTE", tags: PT, live: false },
  { code: "msc", label: "M.Sc", level: "pg", stream: "arts_science_commerce", years: 2, tags: [], live: false },
  { code: "ma", label: "M.A.", level: "pg", stream: "arts_science_commerce", years: 2, tags: [], live: false },
  { code: "phd", label: "PhD", level: "doctoral", stream: "any", years: 5, tags: [], live: false },
] as const satisfies readonly CourseConfig[];

export type CourseCode = (typeof COURSES)[number]["code"];
export const COURSE_CODES = COURSES.map((c) => c.code) as [CourseCode, ...CourseCode[]];

// Every scheme in the registry before course rules existed is for engineering students, and a saved
// answer without a course was given on the B.E./B.Tech-only form.
export const DEFAULT_COURSE: CourseCode = "be_btech";

export const COURSE_BY_CODE: ReadonlyMap<string, CourseConfig> = new Map(COURSES.map((c) => [c.code, c]));
export const LIVE_COURSES: readonly CourseConfig[] = COURSES.filter((c) => c.live);

export function courseOf(code: string | undefined): CourseConfig | undefined {
  return COURSE_BY_CODE.get(code ?? DEFAULT_COURSE);
}
