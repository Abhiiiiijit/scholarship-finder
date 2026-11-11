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
import { COURSE_LEVELS, COURSES, yearsFor } from "@/domain/courses";
import type { T } from "./i18n";

// The labels students see for each stored value, from the screen spec's "Student field values".
// The words live in src/i18n/messages under "options"; a profile value without a label there fails
// typecheck.

export type Option<V extends string = string> = { value: V; label: string };

export const genderOptions = (t: T) => GENDERS.map((value) => ({ value, label: t(`options.gender.${value}`) }));
// S02's course list, grouped by level. Courses that are not live yet are shown but cannot be picked,
// so students see what is coming without getting results Paatra has not checked.
export const courseGroups = (t: T) =>
  COURSE_LEVELS.map((level) => ({
    label: t(`options.courseLevel.${level}`),
    options: COURSES.filter((c) => c.level === level).map((c) => ({
      value: c.code,
      label: c.live ? t(`options.course.${c.code}`) : t("basics.courseSoon", { course: t(`options.course.${c.code}`) }),
      disabled: !c.live,
    })),
  }));
// Only the years the student's course has, e.g. no 5th year for a 3-year B.Sc.
export const yearOptions = (t: T, course?: string) =>
  yearsFor(course, YEARS).map((value) => ({ value, label: t(`options.year.${value}`) }));
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
