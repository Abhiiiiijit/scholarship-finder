import type { Profile } from "../profile";
import type { Snapshot, SnapshotScheme } from "../rules/snapshot";

// PRD section 5, "Worked example: the Maharashtra B.Tech student". Rules are exactly the ones
// that example evaluates, worded as the PRD found them (to be re-verified on the official pages).

export const exampleStudent: Profile = {
  domicile_state: "MH",
  family_income: 900000,
  course: "be_btech",
  year: "1",
  class10_pct: 93,
  class12_pct: 88.9,
};

export const TODAY = "2026-10-24";
export const NOW = new Date("2026-10-24T12:00:00+05:30");
const verified = "2026-10-20T10:00:00+05:30";

const scheme = (s: Omit<SnapshotScheme, "lastVerifiedAt" | "deadline"> & { deadline?: string }) => ({
  deadline: null,
  lastVerifiedAt: verified,
  ...s,
});

const reliance = "https://www.reliancefoundation.org/scholarships";
const mahadbt = "https://mahadbt.maharashtra.gov.in/";
const pragati = "https://www.aicte-india.org/schemes/students-development-schemes/Pragati";
const saksham = "https://www.aicte-india.org/schemes/students-development-schemes/Saksham";
const css = "https://scholarships.gov.in/";

export const section5Snapshot: Snapshot = {
  version: 1,
  generatedAt: "2026-10-24T06:30:00.000Z",
  schemes: [
    scheme({
      slug: "reliance-foundation-ug",
      name: "Reliance Foundation UG Scholarship",
      provider: "PRIVATE",
      stateCode: null,
      officialUrl: reliance,
      amountText: "Up to ₹2 lakh over the degree",
      rules: [
        { group: 1, field: "family_income", op: "LTE", value: 1500000, quote: "Household income under ₹15 lakh", sourceUrl: reliance, ambiguous: false },
        { group: 2, field: "class12_pct", op: "GTE", value: 60, quote: "Class 12 marks of 60% or more", sourceUrl: reliance, ambiguous: false },
        { group: 3, field: "year", op: "EQ", value: "1", quote: "First-year students in a regular, full-time degree", sourceUrl: reliance, ambiguous: false },
      ],
    }),
    scheme({
      slug: "mh-rajarshi-shahu-ebc",
      name: "Rajarshi Shahu Maharaj fee scheme (EBC)",
      provider: "STATE",
      stateCode: "MH",
      officialUrl: mahadbt,
      amountText: "Tuition reimbursement",
      rules: [
        { group: 1, field: "domicile_state", op: "EQ", value: "MH", quote: "Maharashtra domicile", sourceUrl: mahadbt, ambiguous: false },
        { group: 2, field: "family_income", op: "LTE", value: 800000, quote: "Annual family income up to ₹8 lakh", sourceUrl: mahadbt, ambiguous: false },
        { group: 3, field: "MH.cap_admission", op: "IS_TRUE", value: true, quote: "Admission through CAP only", sourceUrl: mahadbt, ambiguous: false },
        // PRD section 6: sources disagree on this scheme's category rule.
        { group: 4, field: "category", op: "IN", value: ["open", "ews", "sebc"], quote: "Open category and EWS students", sourceUrl: mahadbt, ambiguous: true },
      ],
    }),
    scheme({
      slug: "aicte-pragati",
      name: "AICTE Pragati (girls)",
      provider: "AICTE",
      stateCode: null,
      officialUrl: pragati,
      amountText: "₹50,000 a year",
      rules: [
        { group: 1, field: "gender", op: "EQ", value: "female", quote: "Girl student", sourceUrl: pragati, ambiguous: false },
        { group: 2, field: "family_income", op: "LTE", value: 800000, quote: "Family income up to ₹8 lakh per annum", sourceUrl: pragati, ambiguous: false },
      ],
    }),
    scheme({
      slug: "aicte-saksham",
      name: "AICTE Saksham (disability)",
      provider: "AICTE",
      stateCode: null,
      officialUrl: saksham,
      amountText: "₹50,000 a year",
      rules: [
        { group: 1, field: "disability_pct", op: "GTE", value: 40, quote: "Disability of not less than 40%", sourceUrl: saksham, ambiguous: false },
        { group: 2, field: "family_income", op: "LTE", value: 800000, quote: "Family income up to ₹8 lakh per annum", sourceUrl: saksham, ambiguous: false },
      ],
    }),
    scheme({
      slug: "central-sector-scheme",
      name: "Central Sector Scheme (MoE)",
      provider: "CENTRAL",
      stateCode: null,
      officialUrl: css,
      amountText: "₹12,000 a year",
      rules: [
        { group: 1, field: "class12_pct", op: "PERCENTILE_GTE", value: 80, quote: "Above 80th percentile of successful candidates in the relevant stream from the respective Board", sourceUrl: css, ambiguous: false },
        { group: 2, field: "family_income", op: "LTE", value: 450000, quote: "Gross parental/family income up to ₹4.5 lakh per annum", sourceUrl: css, ambiguous: false },
      ],
    }),
  ],
};
