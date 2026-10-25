import type { Profile } from "../profile";

// The labels students see for each stored value, from the screen spec's "Student field values".

export type Option<V extends string = string> = { value: V; label: string };

export const GENDER_OPTIONS: Option<NonNullable<Profile["gender"]>>[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

export const COURSE_OPTIONS: Option<NonNullable<Profile["course"]>>[] = [
  { value: "be_btech", label: "B.E. / B.Tech (engineering)" },
];

export const YEAR_OPTIONS: Option<NonNullable<Profile["year"]>>[] = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "2_lateral", label: "2nd (lateral entry)" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "5", label: "5th (dual degree)" },
];

export const INSTITUTION_OPTIONS: Option<NonNullable<Profile["institution_type"]>>[] = [
  { value: "govt", label: "Government" },
  { value: "aided", label: "Government-aided" },
  { value: "unaided", label: "Unaided (private)" },
  { value: "deemed", label: "Deemed university" },
  { value: "central", label: "Central institute (IIT, NIT, IIIT)" },
];

export const AICTE_OPTIONS: Option<NonNullable<Profile["aicte_approved"]>>[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Not sure" },
];

export const DISABILITY_OPTIONS: Option<NonNullable<Profile["disability"]>>[] = [
  { value: "none", label: "No" },
  { value: "lt40", label: "Yes, under 40%" },
  { value: "gte40", label: "Yes, 40% or more with a certificate" },
];

export const MINORITY_OPTIONS: Option<NonNullable<Profile["minority"]>>[] = [
  { value: "none", label: "None" },
  { value: "muslim", label: "Muslim" },
  { value: "christian", label: "Christian" },
  { value: "sikh", label: "Sikh" },
  { value: "buddhist", label: "Buddhist" },
  { value: "jain", label: "Jain" },
  { value: "parsi", label: "Parsi" },
];

export const PARENT_OCCUPATION_OPTIONS: Option<NonNullable<Profile["parent_occupation"]>[number]>[] = [
  { value: "farmer", label: "Farmer" },
  { value: "labourer", label: "Registered construction or building worker" },
  { value: "armed_forces", label: "Serving in the armed forces" },
  { value: "ex_serviceman", label: "Ex-serviceman" },
  { value: "capf", label: "CAPF or Assam Rifles (serving, retired or died in service)" },
  { value: "none", label: "None of these" },
];

export const SPECIAL_STATUS_OPTIONS: Option<NonNullable<Profile["special_status"]>[number]>[] = [
  { value: "orphan", label: "Orphan" },
  { value: "single_girl", label: "Single girl child" },
  { value: "first_gen", label: "First in family to go to college" },
  { value: "none", label: "None of these" },
];

export const ENTRANCE_OPTIONS: Option<NonNullable<Profile["entrance"]>["exam"]>[] = [
  { value: "jee_main", label: "JEE Main (percentile)" },
  { value: "jee_adv", label: "JEE Advanced (rank)" },
  { value: "mht_cet", label: "MHT-CET (percentile)" },
  { value: "kcet", label: "KCET (rank)" },
  { value: "ts_eapcet", label: "TS EAPCET (rank)" },
  { value: "ojee", label: "OJEE (rank)" },
  { value: "other", label: "Other state exam" },
  { value: "none", label: "No entrance exam" },
];

export function labelOf(options: readonly Option[], value: string | undefined): string | undefined {
  return options.find((o) => o.value === value)?.label;
}
