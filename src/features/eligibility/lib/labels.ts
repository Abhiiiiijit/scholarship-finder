import {
  DISABILITY,
  ENTRANCE_EXAMS,
  GENDERS,
  INSTITUTION_TYPES,
  MINORITIES,
  PARENT_OCCUPATIONS,
  SPECIAL_STATUSES,
  YEARS,
} from "@/domain/profile";
import type { T } from "./i18n";

// The labels students see for each stored value, from the screen spec's "Student field values".
// The words live in src/i18n/messages under "options"; a profile value without a label there fails
// typecheck.

export type Option<V extends string = string> = { value: V; label: string };

export const genderOptions = (t: T) => GENDERS.map((value) => ({ value, label: t(`options.gender.${value}`) }));
export const courseOptions = (t: T) => [{ value: "be_btech" as const, label: t("options.course.be_btech") }];
export const yearOptions = (t: T) => YEARS.map((value) => ({ value, label: t(`options.year.${value}`) }));
export const institutionOptions = (t: T) =>
  INSTITUTION_TYPES.map((value) => ({ value, label: t(`options.institution.${value}`) }));
export const aicteOptions = (t: T) =>
  (["yes", "no", "unknown"] as const).map((value) => ({ value, label: t(`options.aicte.${value}`) }));
export const disabilityOptions = (t: T) => DISABILITY.map((value) => ({ value, label: t(`options.disability.${value}`) }));
export const minorityOptions = (t: T) => MINORITIES.map((value) => ({ value, label: t(`options.minority.${value}`) }));
export const parentOccupationOptions = (t: T) =>
  PARENT_OCCUPATIONS.map((value) => ({ value, label: t(`options.parentOccupation.${value}`) }));
export const specialStatusOptions = (t: T) =>
  SPECIAL_STATUSES.map((value) => ({ value, label: t(`options.specialStatus.${value}`) }));
export const entranceOptions = (t: T) => ENTRANCE_EXAMS.map((value) => ({ value, label: t(`options.entrance.${value}`) }));

// Exams that report a percentile rather than a rank, which decides how the score is asked.
export const PERCENTILE_EXAMS: readonly string[] = ["jee_main", "mht_cet"];

export function labelOf(options: readonly Option[], value: string | undefined): string | undefined {
  return options.find((o) => o.value === value)?.label;
}
