import { z } from "zod";

// A student's answers, as the screen spec's "Student field values" stores them. Every field is
// optional: a skipped question is unknown, which the matcher treats as "needs info", never a fail.
export const YEARS = ["1", "2", "2_lateral", "3", "4", "5"] as const;
export const GENDERS = ["female", "male", "other"] as const;
export const INSTITUTION_TYPES = ["govt", "aided", "unaided", "deemed", "central"] as const;
export const DISABILITY = ["none", "lt40", "gte40"] as const;
export const MINORITIES = ["none", "muslim", "christian", "sikh", "buddhist", "jain", "parsi"] as const;
export const PARENT_OCCUPATIONS = [
  "farmer",
  "labourer",
  "armed_forces",
  "ex_serviceman",
  "capf",
  "none",
] as const;
export const SPECIAL_STATUSES = ["orphan", "single_girl", "first_gen", "none"] as const;
export const ENTRANCE_EXAMS = [
  "jee_main",
  "jee_adv",
  "mht_cet",
  "kcet",
  "ts_eapcet",
  "ojee",
  "other",
  "none",
] as const;

const pct = z.number().min(0).max(100);

export const profileSchema = z.object({
  domicile_state: z.string().regex(/^[A-Z]{2}$/).optional(),
  family_income: z.number().int().min(0).max(99_99_99_999).optional(),
  // Values come from the state's own category list, so this is not a fixed enum.
  category: z.string().min(1).optional(),
  gender: z.enum(GENDERS).optional(),
  course: z.literal("be_btech").optional(),
  year: z.enum(YEARS).optional(),
  class12_pct: pct.optional(),
  class10_pct: pct.optional(),
  institution_type: z.enum(INSTITUTION_TYPES).optional(),
  aicte_approved: z.enum(["yes", "no", "unknown"]).optional(),
  disability: z.enum(DISABILITY).optional(),
  minority: z.enum(MINORITIES).optional(),
  parent_occupation: z.array(z.enum(PARENT_OCCUPATIONS)).optional(),
  special_status: z.array(z.enum(SPECIAL_STATUSES)).optional(),
  entrance: z.object({ exam: z.enum(ENTRANCE_EXAMS), score: z.number().optional() }).optional(),
  // State questions keyed by their prefixed name, e.g. "MH.cap_admission": "yes".
  state: z.record(z.string().regex(/^[A-Z]{2}\.[a-z0-9_]+$/), z.string()).optional(),
});

export type Profile = z.infer<typeof profileSchema>;
