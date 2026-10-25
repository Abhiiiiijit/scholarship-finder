import type { SchemeDraftInput } from "@/domain/registry/scheme-input";

// The Phase 0 schemes as quoted in the PRD's "Quoted rules" tab on 2026-10-24, ready to load into
// the registry as drafts. "verified" rows were fully quoted from a current official source;
// "partial" rows were quoted in part or flagged, and their gaps say what is still missing. The 17
// schemes that could not be opened, and the dropped HR2, are left out.
//
// Quotes keep the tab's convention: text in quote marks is copied from the source, text without
// is a close summary. The seed notes every summary so it is replaced with exact wording before
// anything is published.

type DraftRule = SchemeDraftInput["rules"][number];

// Optional editor fields stay optional here (their input type is unknown because of the blank-to-null step).
type OptionalKeys = "stateCode" | "source" | "appliesVia" | "sourceFormat" | "amountText" | "reviewNotes" | "opensOn" | "deadline";
type SeedInput = Omit<SchemeDraftInput, OptionalKeys | "trackerId"> & Partial<Record<OptionalKeys, string | null>>;

export interface SeedScheme extends SeedInput {
  trackerId: string;
  quality: "verified" | "partial";
  // What the matcher cannot check, or what the quoted source did not say.
  gaps: string[];
}

export const PHASE0_VERIFIED_ON = "2026-10-24";

const rule = (group: number, field: string, op: DraftRule["op"], value: unknown, quote: string, sourceUrl: string, ambiguous = false) =>
  ({ group, field, op, value, quote, sourceUrl, ambiguous }) as DraftRule;

// Fresh awards go to first-year students; holders in later years renew.
const firstYearOrRenewal = (group: number, quote: string, src: string, lateral = false, renewalQuote = quote) => [
  rule(group, "year", "IN", lateral ? ["1", "2_lateral"] : ["1"], quote, src),
  rule(group, "fresh_or_renewal", "EQ", "renewal", renewalQuote, src),
];

// A state scheme whose page states no residence rule: kept to its own state, with no quote, so it
// cannot be published until someone confirms who may apply.
const stateOnly = (group: number, code: string, src: string) => rule(group, "domicile_state", "EQ", code, "", src);

const NOT_DEEMED = ["govt", "aided", "unaided", "central"];
// OBC, EBC and DNT under each state's own category names.
const OBC_LIKE = ["obc", "vjnt", "sbc", "sebc", "bc", "bcm", "mbc_dnc", "ebc", "bc_a", "bc_b", "bc_c", "bc_d", "bc_e", "cat_1", "2a", "2b", "3a", "3b"];

const mahadbt = (str: string) => `https://mahadbt.maharashtra.gov.in/SchemeData/SchemeData?str=${str}`;
const MH = { provider: "STATE", stateCode: "MH", source: "State: MH (MahaDBT)", appliesVia: "State portal", sourceFormat: "HTML" } as const;
const mhDomicile = (group: number, quote: string, src: string) => rule(group, "domicile_state", "EQ", "MH", quote, src);
const MH_ONE_PAYOUT = "MahaDBT pays only one scheme per student, even if several are approved.";

export const PHASE0_SCHEMES: SeedScheme[] = [
  // ── Central ────────────────────────────────────────────────────────────────
  (() => {
    const src = "https://socialjustice.gov.in/writereaddata/UploadFile/95131767944207.pdf";
    return {
      trackerId: "C2", quality: "verified", slug: "top-class-education-sc", name: "Top Class Education for SC Students",
      provider: "CENTRAL", source: "Central: ministry page", appliesVia: "NSP", sourceFormat: "PDF", officialUrl: src,
      amountText: "Full tuition (up to ₹2 lakh a year at private institutes) and ₹86,000 first-year allowance",
      benefitTypes: ["Tuition fee", "Maintenance allowance"],
      documents: ["Caste certificate", "Income certificate (revenue officer)", "Aadhaar-seeded bank account", "Allotment or admission letter", "Fee receipt"],
      rules: [
        rule(1, "family_income", "LTE", 800000, "Total annual family income from all sources up to Rs. 8.00 lakh", src),
        rule(2, "category", "EQ", "sc", "\"The Scheme will cover SC students for pursuing studies beyond 12th class.\"", src),
        ...firstYearOrRenewal(3, "\"Fresh scholarship will be awarded only to 1st year students.\"", src, false,
          "Continues subject to satisfactory performance; terminated if not promoted"),
        rule(4, "listed_institute", "IS_TRUE", true, "Notified institutions only (IITs, NITs, IIITs and others; NAAC A++/A+ or NIRF top 100)", src),
      ],
      gaps: [
        "Not checked by the matcher: \"not more than 2 siblings in a family\".",
        "Not checked by the matcher: 30% of slots go to SC girls.",
        "Cannot be combined with \"any other scholarship benefits of similar scheme\": add tracker ids if any apply.",
      ],
    };
  })(),
  {
    trackerId: "C3", quality: "partial", slug: "top-class-education-st", name: "National Scholarship for Higher Education of ST Students (top class)",
    provider: "CENTRAL", source: "Central: ministry page", appliesVia: "NSP", sourceFormat: "HTML", officialUrl: "https://tribal.nic.in/Scholarship.aspx",
    amountText: "Tuition, living costs, books and computer",
    benefitTypes: ["Tuition fee", "Maintenance allowance"],
    rules: [
      rule(1, "family_income", "LTE", 600000, "\"Family income from all sources should not exceed Rs.6.00 lakhs per annum.\"", "https://tribal.nic.in/DivisionsFiles/aboutSchemes/NFS.pdf"),
      rule(2, "category", "EQ", "st", "ST students", "https://tribal.nic.in/DivisionsFiles/aboutSchemes/NFS.pdf"),
      rule(3, "listed_institute", "IS_TRUE", true, "\"any of the 246 institutions of excellence\" (note); PIB says \"252 such notified institutes\"",
        "https://tribal.nic.in/DivisionsFiles/aboutSchemes/NFS.pdf", true),
    ],
    gaps: [
      "Guidelines PDF on tribal.nic.in not opened: benefit amounts, renewal, siblings, combining rule, documents and dates are missing.",
      "Sources disagree on the number of listed institutes (246 vs 252).",
    ],
  },
  (() => {
    const src = "https://socialjustice.gov.in/public/ckeditor/upload/65661651839791.pdf";
    return {
      trackerId: "C4", quality: "verified", slug: "pm-yasasvi-top-class", name: "PM YASASVI Top Class Education in College for OBC, EBC and DNT",
      provider: "CENTRAL", source: "Central: ministry page", appliesVia: "NSP", sourceFormat: "PDF", officialUrl: "https://socialjustice.gov.in/schemes/101",
      amountText: "Full tuition (up to ₹2 lakh a year at private institutes), ₹3,000 a month living, ₹5,000 books, laptop up to ₹45,000",
      benefitTypes: ["Tuition fee", "Maintenance allowance"],
      documents: ["Income certificate (revenue officer)", "Caste certificate", "Aadhaar-seeded bank account", "Allotment or admission letter", "Fee receipt"],
      rules: [
        rule(1, "family_income", "LTE", 250000, "Family income \"up to Rs. 2.50 lakh\" from all sources", src),
        rule(2, "category", "IN", OBC_LIKE, "OBC, EBC and DNT; \"preference would be given to the OBC students\"", src),
        ...firstYearOrRenewal(3, "Studies beyond class 12; renewals for later years", src, false,
          "Must \"apply for scholarship every year even in case of renewal\""),
        rule(4, "listed_institute", "IS_TRUE", true, "Notified institutions (IIMs, IITs, NITs, AIIMS; NAAC A++/A+, NIRF top 100, Institutions of National Importance)", src),
      ],
      gaps: [
        "The category rule lists each state's OBC, EBC and DNT names (VJNT, BC, MBC/DNC, 2A …): check the mapping.",
        "Not checked by the matcher: not to \"more than 2 siblings in a family\"; 30% of slots for girls.",
      ],
    };
  })(),
  (() => {
    const src = "https://depwd.gov.in/en/scholarship-post-matric/";
    return {
      trackerId: "C5", quality: "verified", slug: "post-matric-disability", name: "Post-Matric Scholarship for Students with Disabilities",
      provider: "CENTRAL", source: "Central: NSP", appliesVia: "NSP", sourceFormat: "HTML", officialUrl: src,
      amountText: "Fees up to ₹1.4 lakh, ₹1,200 a month (hostel) or ₹650 (day), disability and book allowances",
      benefitTypes: ["Tuition fee", "Maintenance allowance"],
      documents: ["Disability certificate", "Aadhaar-seeded bank account"],
      cannotCombineWith: ["M6"],
      rules: [
        rule(1, "disability_pct", "GTE", 40, "\"benchmark disability of 40% or more\"", src),
        rule(2, "family_income", "LTE", 250000, "\"Family income up to Rs. 2.5 lakh per year.\"", src),
      ],
      gaps: [
        "Not checked by the matcher: \"Maximum 2 children with disabilities from the same parents can receive it.\"",
        "Renewal rules and this cycle's dates are not on the page.",
      ],
    };
  })(),
  (() => {
    const src = "https://depwd.gov.in/en/scholarship-top-class-fellowship/";
    return {
      trackerId: "C6", quality: "verified", slug: "top-class-education-disability", name: "Top Class Education for Students with Disabilities",
      provider: "CENTRAL", source: "Central: NSP", appliesVia: "NSP", sourceFormat: "HTML", officialUrl: src,
      amountText: "Fees up to ₹1.9 lakh a year, ₹3,000 a month (hostel) or ₹1,500 (day), computer and device support",
      benefitTypes: ["Tuition fee", "Maintenance allowance"],
      documents: ["Disability certificate", "Aadhaar-seeded bank account", "Allotment or admission letter"],
      rules: [
        rule(1, "disability_pct", "GTE", 40, "\"Students with benchmark disability of 40% or more.\"", src),
        rule(2, "family_income", "LTE", 800000, "\"Family income up to Rs. 8 lakh per year.\"", src),
        rule(3, "listed_institute", "IS_TRUE", true, "\"Students studying in notified institutes.\"", src),
      ],
      gaps: ["Cannot be combined with another scholarship or stipend: add tracker ids if any apply.", "Siblings, renewal and dates are not on the page."],
    };
  })(),
  (() => {
    const src = "https://www.mha.gov.in/sites/default/files/2023-01/PMSSrevisedguidelines_23112020%5B1%5D%5B1%5D_0.pdf";
    return {
      trackerId: "C7", quality: "verified", slug: "pm-scholarship-capf", name: "PM Scholarship Scheme for wards of CAPF and Assam Rifles",
      provider: "CENTRAL", source: "Central: ministry page", appliesVia: "NSP", sourceFormat: "PDF", officialUrl: src,
      amountText: "₹36,000 a year for girls, ₹30,000 for boys",
      benefitTypes: ["Maintenance allowance"],
      documents: ["Class 12 marksheet", "Aadhaar-seeded bank account"],
      rules: [
        rule(1, "parent_occupation", "IN", ["capf"], "Wards and widows of CAPF and Assam Rifles personnel (categories A to G); civilian employees' wards excluded", src),
        rule(2, "class12_pct", "GTE", 60, "60% in the minimum entry qualification (10+2, Diploma or Graduation)", src),
      ],
      gaps: [
        "Not checked by the matcher: wards of State Police personnel \"martyred during Terror/ Naxal attacks\" are also eligible (500 slots).",
        "This cycle's NSP dates are not in the opened sources.",
        "Not with \"other scholarship scheme/getting stipend\": add tracker ids if any apply.",
      ],
    };
  })(),
  (() => {
    const src = "https://online.ksb.gov.in/students-eligible-scholarship.htm";
    return {
      trackerId: "C8", quality: "verified", slug: "pm-scholarship-ex-servicemen", name: "PM Scholarship Scheme for wards of ex-servicemen",
      provider: "CENTRAL", source: "Central: ministry page", appliesVia: "Scheme's own portal", sourceFormat: "HTML", officialUrl: "https://ksb.gov.in/introduction-pmss.htm",
      amountText: "₹3,000 a month for girls, ₹2,500 for boys, paid once a year",
      benefitTypes: ["Maintenance allowance"],
      rules: [
        rule(1, "parent_occupation", "IN", ["ex_serviceman"], "\"Students who are Dependent Wards/ Widows of Ex-servicemen & Ex-Coast Guard personnel.\"", src),
        rule(2, "class12_pct", "GTE", 60, "\"should have scored 60% and above in Minimum Educational Qualification (MEQ)\"", src),
        ...firstYearOrRenewal(3, "\"Students studying in 2nd or subsequent years are not eligible.\"", src, false,
          "\"Rs.2,500/- per month for boys\", \"Rs.3,000/- per month for girls\", paid once a year, for 1–5 years by course length"),
        rule(4, "aicte_approved", "IS_TRUE", true, "Engineering and other technical courses with \"AICTE/UGC approval\"", src),
      ],
      gaps: ["Income limit, renewal marks, combining rule, documents and dates are not stated."],
    };
  })(),

  // ── AICTE ──────────────────────────────────────────────────────────────────
  (() => {
    const index = "https://aicte.gov.in/schemes/students-development-schemes";
    const pib = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1779333";
    return {
      trackerId: "A1", quality: "partial", slug: "aicte-pragati-degree", name: "AICTE Pragati (girls, degree)",
      provider: "AICTE", source: "AICTE", appliesVia: "NSP", sourceFormat: "HTML",
      officialUrl: "https://www.aicte-india.org/schemes/students-development-schemes/Pragati/General-Instructions",
      amountText: "₹50,000 a year", benefitTypes: ["Lump sum"],
      rules: [
        rule(1, "gender", "EQ", "female", "\"meritorious girls taking admission in AICTE approved Technical institution at Degree/ Diploma\"", index),
        rule(2, "family_income", "LTE", 799999, "\"Total income of the family less than Rs. 8 lakh per annum.\" (PIB, 2021)", pib),
        ...firstYearOrRenewal(3, "\"Students admitted in AICTE approved institutions in 1st year of Degree/ Diploma level course\" or \"2nd year of Degree/ Diploma level course through lateral entry\" (PIB)", pib, true),
        rule(4, "aicte_approved", "IS_TRUE", true, "\"meritorious girls taking admission in AICTE approved Technical institution at Degree/ Diploma\"", index),
      ],
      deadline: "2026-10-31",
      gaps: [
        "2026-27 AICTE notice (19.06.2026, seen as a copy on thapar.edu): \"the last date for submission of online applications is 31 .10.2026\" on NSP. Confirm on the AICTE site.",
        "The income limit comes from a 2021 PIB release: check the 2025 guidelines PDF.",
        "Not checked by the matcher: \"Maximum two girls per family.\"",
        "Gap years, documents, renewal, combining rule and current dates not opened.",
      ],
    };
  })(),
  {
    trackerId: "A2", quality: "partial", slug: "aicte-saksham-degree", name: "AICTE Saksham (specially abled, degree)",
    provider: "AICTE", source: "AICTE", appliesVia: "NSP", sourceFormat: "HTML", officialUrl: "https://aicte.gov.in/schemes/students-development-schemes",
    amountText: "₹50,000 a year", benefitTypes: ["Lump sum"],
    rules: [
      rule(1, "disability_pct", "GTE", 40, "\"Differently abled students taking admission in AICTE approved Technical institution at Degree/ Diploma\"",
        "https://aicte.gov.in/schemes/students-development-schemes"),
      rule(2, "aicte_approved", "IS_TRUE", true, "\"Differently abled students taking admission in AICTE approved Technical institution at Degree/ Diploma\"",
        "https://aicte.gov.in/schemes/students-development-schemes"),
    ],
    deadline: "2026-10-31",
    gaps: [
      "2026-27 AICTE notice (19.06.2026, seen as a copy on thapar.edu): \"the last date for submission of online applications is 31 .10.2026\" on NSP. Confirm on the AICTE site.",
      "The 40% disability threshold is assumed, not quoted: confirm it.", "Income limit, number, renewal, documents and dates not opened.",
    ],
  },
  {
    trackerId: "A3", quality: "partial", slug: "aicte-swanath-degree", name: "AICTE Swanath (orphans and others, degree)",
    provider: "AICTE", source: "AICTE", appliesVia: "NSP", sourceFormat: "HTML",
    officialUrl: "https://www.aicte-india.org/schemes/students-development-schemes/Swanath/General-Instructions",
    amountText: "₹50,000 a year", benefitTypes: ["Lump sum"],
    rules: [
      rule(1, "special_status", "IN", ["orphan"],
        "\"Orphan\"; \"Either or both parents died due to Covid-19\"; \"Wards of Armed Forces and Central Paramilitary Forces martyred in action (Shaheed)\"",
        "https://aicte.gov.in/schemes/students-development-schemes"),
    ],
    deadline: "2026-10-31",
    gaps: [
      "2026-27 AICTE notice (19.06.2026, seen as a copy on thapar.edu): \"the last date for submission of online applications is 31 .10.2026\" on NSP. Confirm on the AICTE site.",
      "The profile can only answer \"orphan\": students who lost a parent to Covid-19, or whose parent was martyred in action, are missed until the profile asks.",
      "Scheme Guidelines 2025 link could not be read: income limit, number, course year, renewal, documents and dates missing.",
    ],
  },

  // ── Maharashtra, MahaDBT ───────────────────────────────────────────────────
  (() => {
    const src = mahadbt("E9DDFA703C38E51A7F4D327BDEB7125DE0BA4AE1C51180C272281017EBEF6F7C");
    return {
      trackerId: "M1", quality: "verified", ...MH, slug: "mh-rajarshi-shahu-ebc",
      name: "Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti (EBC/EWS)", officialUrl: src,
      amountText: "50% of tuition and exam fees for boys, 100% for girls", benefitTypes: ["Tuition fee", "Exam fee"],
      documents: ["Class 10 marksheet", "Domicile or residence certificate", "Income certificate (revenue officer)", "Allotment or admission letter"],
      rules: [
        mhDomicile(1, "\"Candidate should be Domicile of Maharashtra State.\"", src),
        rule(2, "family_income", "LTE", 800000, "\"The Total Annual Income of Family / Guardian should not be more than 8 Lakhs.\"", src),
        rule(3, "MH.cap_admission", "IS_TRUE", true, "\"Candidate should be admitted through Centralized Admission Process (CAP).\"", src),
        rule(4, "institution_type", "IN", NOT_DEEMED, "\"Deemed University and Private university is not applicable.\"", src),
      ],
      gaps: [
        "PRD section 6: sources disagree on which categories qualify, so no category rule yet.",
        "Not checked by the matcher: \"should not have a gap of 2 or more than 2 years\"; \"Only 2 child from family\".",
        MH_ONE_PAYOUT,
      ],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51A3D30C2CB15631E4E31F4E2AFF5E4258B33E89887D583052E");
    return {
      trackerId: "M2", quality: "verified", ...MH, slug: "mh-panjabrao-deshmukh-hostel",
      name: "Dr. Panjabrao Deshmukh Vastigruh Nirvah Bhatta (hostel)", officialUrl: src,
      amountText: "₹38,000 to ₹60,000 by city for hostel, food and subsistence", benefitTypes: ["Hostel allowance", "Maintenance allowance"],
      documents: ["Class 10 marksheet", "Domicile or residence certificate", "Income certificate (revenue officer)", "Allotment or admission letter"],
      rules: [
        mhDomicile(1, "\"Candidate should be Domicile of Maharashtra State.\"", src),
        rule(2, "family_income", "LTE", 800000, "\"should not be more than 8 Lakhs\"", src),
        rule(3, "category", "IN", ["open", "ews", "sebc"], "\"admission under the General category and SEBC Category\"", src),
        rule(4, "MH.cap_admission", "IS_TRUE", true, "\"Candidate should be admitted through Centralized Admission Process (CAP).\"", src),
        rule(5, "institution_type", "IN", NOT_DEEMED, "\"Deemed University and Private university are not applicable.\"", src),
        rule(6, "MH.stay", "EQ", "hostel", "\"Hosteller documents (In case of private hostel or Paying Guest, an agreement with the owner will be required).\"", src),
      ],
      gaps: [
        "EWS is read as part of \"General category\": confirm.",
        "The eligibility list does not name hostel stay; the rule comes from the scheme's name (hostel allowance), the \"Residence Allowance\" benefit and the hosteller documents.",
        "The page does not say the amounts are per year.",
        "Not checked by the matcher: gap of 2 or more years; \"only 2 children from the family\".",
        MH_ONE_PAYOUT,
      ],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51A2C489D8FEE1DE79D3D179EC97AB141825125A9561892EF10");
    return {
      trackerId: "M3", quality: "verified", ...MH, slug: "mh-minority-professional",
      name: "Scholarship for Minority Students in Higher and Professional Courses", officialUrl: src,
      amountText: "Up to ₹50,000 a year or actual tuition and exam fee, whichever is less", benefitTypes: ["Tuition fee", "Exam fee"],
      documents: ["Class 10 marksheet", "Domicile or residence certificate", "Income certificate (revenue officer)"],
      rules: [
        rule(1, "minority", "IN", ["muslim", "buddhist", "christian", "sikh", "parsi", "jain"], "\"Muslim , Buddhist, Christian , Sikh , Parsi , Jain & Jews Community\"", src),
        mhDomicile(2, "\"Candidate should be Domicile of Maharashtra State.\"", src),
        rule(3, "family_income", "LTE", 800000, "\"should not be more than 8 Lakhs\"", src),
      ],
      gaps: ["The profile has no option for Jews: add one or confirm by hand.", "\"Applicant should not avail any other scholarship/stipend.\"", MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51ACE99921E698B1EE85995B38445F14746E1B0DD7E66FFF88B");
    return {
      trackerId: "M4", quality: "verified", ...MH, slug: "mh-goi-post-matric-sc", name: "Government of India Post-Matric Scholarship (SC)", officialUrl: src,
      amountText: "All compulsory fees and monthly maintenance", benefitTypes: ["Tuition fee", "Exam fee", "Maintenance allowance"],
      documents: ["Income certificate (revenue officer)", "Caste certificate", "Class 10 marksheet", "Class 12 marksheet"],
      rules: [
        rule(1, "category", "EQ", "sc", "\"Student category shall belong to Scheduled caste or Navbouddha\"", src),
        mhDomicile(2, "\"Student shall belong to resident of Maharashtra\"", src),
        rule(3, "family_income", "LTE", 250000, "\"The parents/Guardian annual income shall be less than or equal to Rs. 2,50,000.\"", src),
      ],
      gaps: ["\"Only 2 professional Courses are allowed.\"", MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51AE0CB048159E784170A4F3BD768B3A64E4772B0EF7B9990B2");
    return {
      trackerId: "M5", quality: "verified", ...MH, slug: "mh-freeship-sc", name: "Post-Matric Tuition Fee and Exam Fee Freeship (SC)", officialUrl: src,
      amountText: "Tuition, exam and other compulsory fees", benefitTypes: ["Tuition fee", "Exam fee"],
      documents: ["Income certificate (revenue officer)", "Caste certificate", "Caste validity certificate", "Class 10 marksheet", "Class 12 marksheet", "Allotment or admission letter"],
      rules: [
        rule(1, "category", "EQ", "sc", "\"Scheduled caste or Neo bouddhist\"", src),
        mhDomicile(2, "\"should be resident of Maharashtra\"", src),
        rule(3, "family_income", "GTE", 250001, "\"annual income above Rs. 250000.to unlimited\"", src),
        rule(4, "MH.cap_admission", "IS_TRUE", true, "Professional courses \"admit through CAP round only\"", src),
      ],
      gaps: ["For SC families above the M4 income limit.", "Institution must be \"located in Maharashtra & shall be government recognized\".", MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51ABCC44582035F06CB9B6B2704869FE16E9E8F561A36261D4D");
    return {
      trackerId: "M6", quality: "verified", ...MH, slug: "mh-post-matric-disability", name: "Post-Matric Scholarship for Persons with Disability", officialUrl: src,
      amountText: "All compulsory fees and maintenance for up to 10 months", benefitTypes: ["Tuition fee", "Exam fee", "Maintenance allowance"],
      documents: ["Previous year marksheet (renewals)", "Domicile or residence certificate", "Disability certificate"],
      cannotCombineWith: ["C5"],
      rules: [
        rule(1, "disability_pct", "GTE", 40, "\"Student should be disable. (40% or above)\"", src),
        mhDomicile(2, "\"Student should be residential of Maharashtra.\"", src),
      ],
      gaps: [
        "Income limit is not stated on the page.",
        "Not checked by the matcher: \"If candidate is working full time employment then he/she is not eligible.\"",
        "\"Candidate only can apply Shahu Maharaj Merit Schol with this Scheme.\"",
      ],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51A668ED132B54E2162E54C475F826D85C79DA948301E5F7772");
    return {
      trackerId: "M7", quality: "verified", ...MH, slug: "mh-goi-post-matric-st", name: "Government of India Post-Matric Scholarship (ST)", officialUrl: src,
      amountText: "Monthly maintenance (₹230 to ₹1,200) and ₹1,200 book grant a year", benefitTypes: ["Maintenance allowance"],
      documents: ["Caste certificate", "Income certificate (revenue officer)", "Previous year marksheet (renewals)", "Caste validity certificate"],
      rules: [
        rule(1, "category", "EQ", "st", "\"Applicable for ST only\"", src),
        rule(2, "family_income", "LTE", 250000, "\"If Family Income <= 2,50,000, he will get the scholarship\"", src),
        rule(3, "domicile_state", "EQ", "MH", "\"Are you Domicile of Maharashtra?\" (asked in every MahaDBT applicant profile; the scheme page itself states no residence rule)", src, true),
      ],
      gaps: [
        "The page does not state domicile as a rule, so the matcher asks students to confirm it.",
        "Not checked by the matcher: \"Back to back drop for 2 years he/she will not be allowed to fill form\".",
        MH_ONE_PAYOUT,
      ],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51AE7C10C1B9446574716EB93196C4CB29808753F77C61BEF29");
    return {
      trackerId: "M8", quality: "verified", ...MH, slug: "mh-freeship-st", name: "Tuition Fee and Exam Fee Freeship (ST)", officialUrl: src,
      amountText: "Tuition and exam fee reimbursed", benefitTypes: ["Tuition fee", "Exam fee"],
      documents: ["Caste certificate", "Previous year marksheet (renewals)", "Caste validity certificate"],
      rules: [
        rule(1, "category", "EQ", "st", "\"Applicable for ST only\"", src),
        rule(2, "family_income", "GTE", 250001, "\"Family annual income limit is RS. > 2,50,000\"", src),
        rule(3, "domicile_state", "EQ", "MH", "\"Are you Domicile of Maharashtra?\" (asked in every MahaDBT applicant profile; the scheme page itself states no residence rule)", src, true),
      ],
      gaps: ["For ST families above the M7 income limit.", "The page says \"This is state sponsored scheme.\" but states no residence rule, so the matcher asks students to confirm it.", MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51AB02E984835E89FEFDB316E301CE6A991F41C5D42B01A7D7E");
    return {
      trackerId: "M9", quality: "verified", ...MH, slug: "mh-post-matric-obc", name: "Post-Matric Scholarship to OBC Students", officialUrl: src,
      amountText: "Tuition, exam fees and maintenance (100% at government and aided colleges, 50% of fees at unaided; 100% for girls)",
      benefitTypes: ["Tuition fee", "Exam fee", "Maintenance allowance"],
      documents: ["Caste certificate", "Income certificate (revenue officer)", "Caste validity certificate", "Previous year marksheet (renewals)", "Ration card"],
      rules: [
        rule(1, "category", "EQ", "obc", "\"should be belongs to OBC category\"", src),
        mhDomicile(2, "\"Applicants must be residents of Maharashtra.\"", src),
        rule(3, "family_income", "LTE", 250000, "\"annual Income should be less than or equal to Rs.2.50 Lac\"", src),
        rule(4, "MH.cap_admission", "IS_TRUE", true, "CAP round for professional courses", src),
      ],
      gaps: [
        "Not checked by the matcher: \"Only two children (i)any number of girls applicants allowed\".",
        "\"No scholarship will be paid under this scheme from the date he/she accepts another Scholarship / stipend.\"",
        MH_ONE_PAYOUT,
      ],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51A19A7691F3B40AD4EE0F3DDA5DE324AC54819922BB3D36B63");
    return {
      trackerId: "M10", quality: "verified", ...MH, slug: "mh-fees-obc", name: "Tuition Fees and Exam Fees to OBC Students", officialUrl: src,
      amountText: "Tuition and exam fee: 100% at government and aided colleges, 50% at unaided, 100% for girls", benefitTypes: ["Tuition fee", "Exam fee"],
      documents: ["Caste certificate", "Allotment or admission letter", "Caste validity certificate", "Non-creamy layer certificate", "Ration card"],
      rules: [
        rule(1, "category", "EQ", "obc", "\"Applicant should be belongs to OBC category.\"", src),
        mhDomicile(2, "\"Applicants must be residents of Maharashtra.\"", src),
        rule(3, "MH.cap_admission", "IS_TRUE", true, "\"For professional courses Applicant should admitted through CAP round is must.\"", src),
        rule(4, "institution_type", "IN", NOT_DEEMED, "Deemed university admissions not eligible", src),
        rule(5, "MH.ncl", "IS_TRUE", true, "No figure; needs an \"Income certificate / Non creamy layer certificate\"", src),
      ],
      gaps: ["No income figure on the page; the non-creamy-layer certificate stands in for it.", MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51A20E2AADEC5FCAFCAA9EF15C9E7BE6DA49EFF8397D1CB5063");
    return {
      trackerId: "M11", quality: "verified", ...MH, slug: "mh-post-matric-obc-girls", name: "Post-Matric Scholarship to OBC Girls in Professional Courses", officialUrl: src,
      amountText: "Full tuition, exam fees and maintenance allowance", benefitTypes: ["Tuition fee", "Exam fee", "Maintenance allowance"],
      documents: ["Income certificate (revenue officer)", "Caste validity certificate", "Ration card"],
      rules: [
        rule(1, "gender", "EQ", "female", "\"Scholarship is allowed for all girl applicants\"", src),
        rule(2, "category", "EQ", "obc", "\"Applicant must belong to the OBC category.\"", src),
        mhDomicile(3, "\"Applicant must be a resident of Maharashtra.\"", src),
        rule(4, "family_income", "LTE", 250000, "\"The annual family income should be less than or equal to RS.2.5 lakh.\"", src),
        rule(5, "MH.cap_admission", "IS_TRUE", true, "CAP for professional courses", src),
      ],
      gaps: [MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51A861D18FEEFAC4F5F6568CABC51F37B2D8E783259DE953673");
    return {
      trackerId: "M12", quality: "verified", ...MH, slug: "mh-fees-obc-girls", name: "Tuition Fees and Exam Fees to OBC Girls in Professional Courses", officialUrl: src,
      amountText: "100% of tuition and exam fees", benefitTypes: ["Tuition fee", "Exam fee"],
      documents: ["Allotment or admission letter", "Caste validity certificate", "Non-creamy layer certificate", "Ration card"],
      rules: [
        rule(1, "gender", "EQ", "female", "For \"girl applicants studying in government/aided/non-government/unaided institutions\"", src),
        rule(2, "category", "EQ", "obc", "\"The applicant must belong to the OBC category.\"", src),
        mhDomicile(3, "\"The applicant must be a resident of Maharashtra.\"", src),
        rule(4, "MH.cap_admission", "IS_TRUE", true, "\"For professional courses, admission through the CAP round is mandatory.\"", src),
        rule(5, "MH.ncl", "IS_TRUE", true, "No figure; \"Income Certificate / Non-Creamy Layer Certificate\"", src),
      ],
      gaps: ["No income figure on the page; the non-creamy-layer certificate stands in for it.", MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51AFD83FFC8C5199983E26D3BE9645241F26E1947ED73B2823D");
    return {
      trackerId: "M13", quality: "verified", ...MH, slug: "mh-post-matric-vjnt", name: "Post-Matric Scholarship to VJNT Students", officialUrl: src,
      amountText: "Tuition, exam fee and maintenance allowance paid 100%", benefitTypes: ["Tuition fee", "Exam fee", "Maintenance allowance"],
      documents: ["Caste certificate", "Income certificate (revenue officer)", "Caste validity certificate", "Ration card"],
      rules: [
        rule(1, "category", "EQ", "vjnt", "\"Applicant should be belongs to VJNT category.\"", src),
        mhDomicile(2, "\"Applicants must be residents of Maharashtra.\"", src),
        rule(3, "family_income", "LTE", 250000, "\"annual Income should be less than or equal to Rs.2.50 Lac\"", src),
        rule(4, "MH.cap_admission", "IS_TRUE", true, "CAP round for professional courses", src),
      ],
      gaps: ["Not checked by the matcher: \"any number of girls applicants allowed\"; boys \"maximum 2 of the same parent\".", MH_ONE_PAYOUT],
    };
  })(),
  (() => {
    const src = mahadbt("E9DDFA703C38E51AAC3D52BF09BB773555F3C82D946AC992C39B99CA73982F62");
    return {
      trackerId: "M14", quality: "verified", ...MH, slug: "mh-fees-vjnt", name: "Tuition Fees and Exam Fees to VJNT Students", officialUrl: src,
      amountText: "100% of tuition and exam fees approved by the Fee Committee", benefitTypes: ["Tuition fee", "Exam fee"],
      documents: ["Caste certificate", "Allotment or admission letter", "Non-creamy layer certificate", "Ration card"],
      rules: [
        rule(1, "category", "EQ", "vjnt", "\"Applicant should be belongs to VJNT category.\"", src),
        mhDomicile(2, "\"Applicants must be residents of Maharashtra.\"", src),
        rule(3, "MH.cap_admission", "IS_TRUE", true, "\"For professional courses Applicant should admitted through CAP round is must.\"", src),
        rule(4, "institution_type", "IN", NOT_DEEMED, "Deemed university professional admissions \"won't get benefit\"", src),
        rule(5, "MH.ncl", "IS_TRUE", true, "No figure; \"Income certificate / Non Creamy layer Certificate\"", src),
      ],
      gaps: ["No income figure on the page; the non-creamy-layer certificate stands in for it.", MH_ONE_PAYOUT],
    };
  })(),

  // ── Other states ───────────────────────────────────────────────────────────
  (() => {
    const src = "https://www.education.gov.in/sites/upload_files/mhrd/files/upload_document/PM-USP-Guidelines.pdf";
    return {
      trackerId: "JK1", quality: "verified", slug: "jk-pm-usp-special-scholarship", name: "PM-USP Special Scholarship Scheme for J&K and Ladakh (SSS)",
      provider: "STATE", stateCode: "JK", source: "State: JK (AICTE portal (SSS))", appliesVia: "AICTE portal", sourceFormat: "PDF", officialUrl: src,
      amountText: "Academic fee up to ₹1.25 lakh and ₹1 lakh a year maintenance", benefitTypes: ["Tuition fee", "Maintenance allowance"],
      documents: ["Domicile or residence certificate", "Class 10 marksheet", "Class 12 marksheet", "Income certificate (revenue officer)"],
      rules: [
        rule(1, "domicile_state", "IN", ["JK", "LA"], "\"domicile of Union Territories of J&K and Ladakh\"", src),
        rule(2, "family_income", "LTE", 800000, "\"Rs. 8.00 Lakh or less per annum\"", src),
      ],
      gaps: [
        "Not checked by the matcher: admission \"through AICTE's counselling process\"; Class 12 from JKBOSE or CBSE schools in the UTs; institution accreditation (NAAC 3.0, NIRF top 100 or NBA).",
        "Excluded if receiving \"benefit of any other scholarship Scheme\".",
      ],
    };
  })(),
  (() => {
    const src = "https://harchhatravratti.highereduhry.ac.in/Notices/SchemeGuidelines15072026.pdf";
    return {
      trackerId: "HR1", quality: "verified", slug: "hr-kalpana-chawla-girls", name: "Kalpana Chawla Chhatravratti Yojna for Girls (engineering)",
      provider: "STATE", stateCode: "HR", source: "State: HR (Har-Chhatravratti)", appliesVia: "State portal", sourceFormat: "PDF", officialUrl: src,
      amountText: "₹8,350 a month (JEE Advanced rank) or ₹4,500 a month (JEE Main rank)", benefitTypes: ["Maintenance allowance"],
      documents: ["Class 10 marksheet", "Class 12 marksheet", "Domicile or residence certificate"],
      deadline: "2026-08-10",
      rules: [
        rule(1, "gender", "EQ", "female", "\"meritorious girl students\"; first-year admits only", src),
        rule(2, "domicile_state", "EQ", "HR", "Class 10 and 12 from a Haryana school, otherwise a \"Haryana Residence Certificate\"", src),
        rule(3, "class12_pct", "GTE", 80, "Class 12: 80% (Haryana Board) or 85% (CBSE, ICSE and others)", src, true),
        ...firstYearOrRenewal(4, "\"meritorious girl students\"; first-year admits only", src, false, "At least 60% each semester; compartment or re-appear stops payments"),
      ],
      gaps: [
        "The Class 12 cut-off depends on the board (80% Haryana, 85% others), so it shows as \"confirm\".",
        "BC candidates must be outside the creamy layer, verified by PPP ID.",
        "The 2026 cycle closed on 10 August 2026.",
      ],
    };
  })(),
  (() => {
    const src = "https://higheredn.delhi.gov.in/sites/default/files/generic_multiple_files/1_1.pdf";
    return {
      trackerId: "DL1", quality: "verified", slug: "dl-merit-cum-means-state-universities", name: "Merit-cum-Means Financial Assistance (Delhi state universities)",
      provider: "STATE", stateCode: "DL", source: "State: DL (Institution, e-District)", appliesVia: "Through the institution", sourceFormat: "PDF", officialUrl: src,
      amountText: "25% to 100% of tuition, by family income", benefitTypes: ["Tuition fee"],
      documents: ["Class 12 marksheet", "Caste certificate", "Aadhaar-seeded bank account", "Income certificate (revenue officer)", "Ration card"],
      rules: [
        rule(1, "DL.delhi_univ", "IN", ["dtu", "nsut", "iiitd", "igdtuw", "dseu"],
          "\"enrolled for under graduate programme in any of the Delhi State Public Universities\" or their colleges", src, true),
        rule(2, "family_income", "LTE", 600000, "NFSA card: 100% of tuition; income up to Rs 2.50 lakh: 50%; above Rs 2.50 lakh up to Rs 6 lakh: 25%", src),
        rule(3, "class12_pct", "GTE", 55, "60%; \"A relaxation of 5% in qualifying aggregate percentage of marks\" for SC/ST", src, true),
      ],
      gaps: [
        "The Delhi state university list in the profile (DTU, NSUT, IIIT-D, IGDTUW, DSEU) misses GGSIPU and its colleges: confirm.",
        "Marks: 60%, or 55% for SC/ST, so it shows as \"confirm\".",
        "The institution sends its list to the Directorate by end of October; no student deadline.",
      ],
    };
  })(),
  (() => {
    const src = "https://scholarshipportal.mp.nic.in/MedhaviChhatra/Medhavi_New/About.aspx";
    return {
      trackerId: "MP1", quality: "verified", slug: "mp-medhavi-vidyarthi", name: "Mukhyamantri Medhavi Vidyarthi Yojana (MMVY)",
      provider: "STATE", stateCode: "MP", source: "State: MP (MP Scholarship Portal)", appliesVia: "State portal", sourceFormat: "HTML", officialUrl: src,
      amountText: "Full fees at government colleges; up to ₹1.5 lakh or actual tuition at private engineering colleges", benefitTypes: ["Tuition fee"],
      rules: [
        rule(1, "domicile_state", "EQ", "MP", "\"मध्य प्रदेश का निवासी होना आवश्यक है\" (must be an MP resident)", src),
        rule(2, "family_income", "LTE", 600000, "\"रू. 6 लाख से अधिक न हो\" (not above Rs 6 lakh)", src),
        rule(3, "class12_pct", "GTE", 75, "Class 12: 75% (MP board) or 85% (CBSE/ICSE)", src, true),
        rule(4, "entrance_exam", "EQ", "jee_main", "engineering needs JEE Main \"रेंक 50 हजार के अंतर्गत\" (rank within 50,000)", src),
        rule(5, "entrance_rank", "LTE", 50000, "engineering needs JEE Main \"रेंक 50 हजार के अंतर्गत\" (rank within 50,000)", src),
      ],
      gaps: ["The Class 12 cut-off depends on the board (75% MP board, 85% CBSE/ICSE), so it shows as \"confirm\".", "Renewal, documents, combining rule and dates not stated."],
    };
  })(),
  (() => {
    const src = "https://bcw.tn.gov.in/sub_page/8";
    return {
      trackerId: "TN3", quality: "verified", slug: "tn-bc-mbc-dnc-scholarships", name: "Tamil Nadu BC, MBC and DNC scholarships",
      provider: "STATE", stateCode: "TN", source: "State: TN (Department pages)", appliesVia: "State portal", sourceFormat: "HTML", officialUrl: src,
      amountText: "Fees at government rates and hostel allowance", benefitTypes: ["Tuition fee", "Exam fee", "Hostel allowance"],
      rules: [
        rule(1, "family_income", "LTE", 250000, "Up to Rs. 2.50 lakh", src),
        rule(2, "category", "IN", ["bc", "bcm", "mbc_dnc"], "\"scholarships are sanctioned to Backward Classes, Most Backward Classes and Denotified Communities students\"", src),
        rule(3, "domicile_state", "EQ", "TN", "must be a native of Tamil Nadu who studied in a TN government school", src, true),
      ],
      gaps: [
        "This row covers three schemes on one page (PM-YASASVI UG professional, State Post-Matric, and UG/PG in central institutions): split it before publishing.",
          "Not checked by the matcher: \"First Graduate in the family\" (PM-YASASVI); government and aided colleges only (State PMS).",
        "Students apply on the Unified State Scholarship Portal (umis.tn.gov.in).",
        "The page does not name Backward Class Muslims separately; BCM is read as part of Backward Classes: confirm.",
      ],
    };
  })(),

  // ── Private ────────────────────────────────────────────────────────────────
  (() => {
    const src = "https://scholarshipportal.reliancefoundation.org/Guidance%20to%20Applicants%20UG.pdf";
    return {
      trackerId: "P1", quality: "verified", slug: "reliance-foundation-ug", name: "Reliance Foundation Undergraduate Scholarships",
      provider: "PRIVATE", source: "Private: CSR or company", appliesVia: "Scheme's own portal", sourceFormat: "HTML",
      officialUrl: "https://www.scholarships.reliancefoundation.org/UG_Scholarship",
      amountText: "Up to ₹2 lakh over the degree", benefitTypes: ["Lump sum"],
      documents: ["Class 10 marksheet", "Class 12 marksheet", "Income certificate (revenue officer)", "College bonafide certificate"],
      opensOn: "2026-08-15", deadline: "2026-10-05",
      rules: [
        rule(1, "family_income", "LTE", 1500000, "\"household income of ₹15 lakh or less\"", src),
        rule(2, "class12_pct", "GTE", 60, "\"Have passed Class 12 with a minimum of 60% marks.\"", src),
        ...firstYearOrRenewal(3, "\"first-year undergraduate students studying in regular full-time degree programmes across all streams\"", src, false,
          "\"Successfully pass all examinations and be promoted to the next academic year\""),
      ],
      gaps: ["Online aptitude test required (by 18 October 2026).", "\"Be an Indian citizen residing in India.\""],
    };
  })(),
  (() => {
    const src = "https://www.kotakeducationfoundation.org/kotak-kanya-scholarship";
    return {
      trackerId: "P5", quality: "verified", slug: "kotak-kanya", name: "Kotak Kanya Scholarship (girls)",
      provider: "PRIVATE", source: "Private: trust or foundation", appliesVia: "Scheme's own portal", sourceFormat: "HTML", officialUrl: src,
      amountText: "₹1.5 lakh a year until graduation", benefitTypes: ["Lump sum"],
      documents: ["Class 12 marksheet", "Income certificate (revenue officer)", "Allotment or admission letter", "Fee receipt", "Aadhaar-seeded bank account"],
      opensOn: "2026-07-14", deadline: "2026-09-30",
      rules: [
        rule(1, "gender", "EQ", "female", "\"Open for meritorious girl students across India.\"", src),
        rule(2, "class12_pct", "GTE", 75, "\"at least 75% or more marks or equivalent CGPA in Class 12 board examinations\"", src),
        rule(3, "family_income", "LTE", 599999, "\"annual family income must be less than INR 6,00,000\"", src),
        ...firstYearOrRenewal(4, "\"secured admission to the first year of graduation programs in the academic year 2026-27\"", src, false,
          "\"at least 6 CGPA yearly\", no dropout, no disciplinary issues"),
      ],
      gaps: [
        "Not checked by the matcher: \"institutes of repute like NIRF/NAAC accredited\".",
        "Children of Kotak Mahindra Group, Kotak Education Foundation and Buddy4Study employees are excluded.",
      ],
    };
  })(),
  (() => {
    const src = "https://licindia.in/documents/d/guest/golden-jubilee-scholarship-scheme-2026";
    return {
      trackerId: "P6", quality: "verified", slug: "lic-golden-jubilee", name: "LIC Golden Jubilee Scholarship",
      provider: "PRIVATE", source: "Private: trust or foundation", appliesVia: "Scheme's own portal", sourceFormat: "PDF",
      officialUrl: "https://licindia.in/golden-jubilee-scholarship-scheme",
      amountText: "₹40,000 a year (engineering)", benefitTypes: ["Lump sum"],
      documents: ["Income certificate (revenue officer)", "Aadhaar-seeded bank account"],
      deadline: "2026-09-30",
      rules: [
        rule(1, "class12_pct", "GTE", 60, "\"at least 60% marks or equivalent CGPA grade in the Academic Year 2023-24/2024-25/2025-26\"", src),
        rule(2, "family_income", "LTE", 450000, "\"annual income (from all sources) not exceeding Rs.4,50,000/- per annum\"", src),
      ],
      gaps: [
        "Not checked by the matcher: passing year must be 2023-24, 2024-25 or 2025-26 (at most two gap years).",
        "Not checked by the matcher: \"Scholarship is awarded to only one student in a family\".",
        "\"Candidates who are already receiving Scholarship from other Trust / Institution will not be considered\"; government scholarships allowed.",
      ],
    };
  })(),
  (() => {
    const src = "https://app.sitaramjindalfoundation.org/Student/FAQ";
    return {
      trackerId: "P10", quality: "verified", slug: "sitaram-jindal-degree", name: "Sitaram Jindal Foundation Scholarship (degree)",
      provider: "PRIVATE", source: "Private: trust or foundation", appliesVia: "Scheme's own portal", sourceFormat: "HTML",
      officialUrl: "https://www.sitaramjindalfoundation.org/scholarships-for-students-in-bangalore.php",
      amountText: "Set by the foundation's criteria, with extra support for hostellers", benefitTypes: ["Lump sum"],
      documents: ["Previous year marksheet (renewals)", "Income certificate (revenue officer)", "Aadhaar-seeded bank account"],
      rules: [
        rule(1, "family_income", "LTE", 400000, "\"For salaried employees: ₹4 lakh per year\"; \"For others: ₹2.5 lakh per year\"", src, true),
        rule(2, "year", "IN", ["1", "2", "2_lateral", "3"], "\"Final year students are not eligible to apply\"", src),
      ],
      gaps: [
        "The income limit depends on whether the family is salaried (₹4 lakh) or not (₹2.5 lakh), so it shows as \"confirm\".",
        "Not checked by the matcher: \"Government and Government-aided schools, colleges, and institutions\", or private ones without exorbitant fees.",
        "Must declare \"not receiving any other scholarships or fee reimbursement\".",
      ],
    };
  })(),

  // ── Partly quoted ──────────────────────────────────────────────────────────
  (() => {
    const src = "https://harchhatravratti.highereduhry.ac.in/Notices/Reimbursement%20of%20Tuition%20Fee%20and%20Transport%20Facility.pdf";
    return {
      trackerId: "HR3", quality: "partial", slug: "hr-tuition-reimbursement-sc", name: "Reimbursement of Tuition Fee to SC students (technical education)",
      provider: "STATE", stateCode: "HR", source: "State: HR (Har-Chhatravratti)", appliesVia: "State portal", sourceFormat: "PDF", officialUrl: src,
      amountText: "Actual tuition or ₹40,000 a year (degree), whichever is lower, plus a bus or train pass", benefitTypes: ["Tuition fee"],
      rules: [
        rule(1, "category", "EQ", "sc", "\"Scheduled Castes Students of Haryana\"", src),
        rule(2, "domicile_state", "EQ", "HR", "\"Scheduled Castes Students of Haryana\"", src),
        rule(3, "family_income", "BETWEEN", [250000, 350000], "\"Between Rs. 2.5 lac to Rs.3.5 lac\"", src),
      ],
      gaps: [
        "Only the 2022-23 notice was found (window 15.01.2023 to 14.02.2023): confirm a current cycle.",
        "Not checked by the matcher: \"admitted through centralized counseling\"; PPP needed.",
      ],
    };
  })(),
  {
    trackerId: "DL2", quality: "partial", slug: "dl-tte-merit", name: "Merit Scholarship, Delhi government institutes of technology",
    provider: "STATE", stateCode: "DL", source: "State: DL (Institution, e-District)", appliesVia: "Through the institution", sourceFormat: "HTML",
    officialUrl: "https://tte.delhi.gov.in/tte/scholarship", amountText: "₹950 a month (day scholars)", benefitTypes: ["Maintenance allowance"],
    rules: [
      rule(1, "class12_pct", "GTE", 80, "\"80% and above marks in the previous years' examination\"", "https://tte.delhi.gov.in/tte/scholarship"),
      stateOnly(2, "DL", "https://tte.delhi.gov.in/tte/scholarship"),
    ],
    gaps: ["The page talks about government institutes of technology and polytechnics: confirm degree students are covered.", "Residence, renewal, documents and how to apply are not stated."],
  },
  {
    trackerId: "DL3", quality: "partial", slug: "dl-tte-merit-cum-means", name: "Merit-cum-Means Scholarship, Delhi government institutes of technology",
    provider: "STATE", stateCode: "DL", source: "State: DL (Institution, e-District)", appliesVia: "Through the institution", sourceFormat: "HTML",
    officialUrl: "https://tte.delhi.gov.in/tte/scholarship", amountText: "₹1,025 a month (hostel) or ₹700 (day)", benefitTypes: ["Maintenance allowance"],
    rules: [
      rule(1, "class12_pct", "GTE", 70, "\"70% and above marks in the previous year's examination\"", "https://tte.delhi.gov.in/tte/scholarship"),
      rule(2, "family_income", "LTE", 200000, "\"Rs. 2.00 lakh annual\" (SDM certificate)", "https://tte.delhi.gov.in/tte/scholarship"),
      stateOnly(3, "DL", "https://tte.delhi.gov.in/tte/scholarship"),
    ],
    gaps: ["The page talks about government institutes of technology and polytechnics: confirm degree students are covered.", "Residence, renewal, documents and how to apply are not stated."],
  },
  {
    trackerId: "GA1", quality: "partial", slug: "ga-bursary", name: "Goa Bursary (Sant Sohirobanath Ambiye Dyanvrudhi Shishyavrutti)",
    provider: "STATE", stateCode: "GA", source: "State: GA (Bursary 2.0, CM Scholarship Portal)", appliesVia: "State portal", sourceFormat: "HTML",
    officialUrl: "https://bursary.dhe.goa.gov.in/about", amountText: "Fees actually paid, up to ₹40,000 a year", benefitTypes: ["Tuition fee"],
    rules: [
      rule(1, "family_income", "LTE", 499999, "Combined parent income \"is less than Rupees five lakhs\"", "https://bursary.dhe.goa.gov.in/about"),
      stateOnly(2, "GA", "https://bursary.dhe.goa.gov.in/about"),
    ],
    gaps: ["For institutions in Goa.", "Residence period, marks, renewal, documents and dates are not stated."],
  },
  {
    trackerId: "TR1", quality: "partial", slug: "tr-higher-education-schemes", name: "Tripura Higher Education scholarship schemes",
    provider: "STATE", stateCode: "TR", source: "State: TR (DHE Tripura, NSP)", sourceFormat: "HTML",
    officialUrl: "https://highereducation.tripura.gov.in/DHE/scholarship-scheme",
    rules: [],
    gaps: [
      "This row covers five schemes (Post Madhyamik Stipend, NEC Merit, Lower Income Group, Tripura Engineering College, Dr. Ambedkar EBC): split it into one scheme each, using the Quoted rules tab.",
      "The amounts look decades old and no domicile rule is stated.",
    ],
  },
  {
    trackerId: "TR2", quality: "partial", slug: "tr-post-matric-st", name: "Tripura post-matric scholarship for ST students",
    provider: "STATE", stateCode: "TR", source: "State: TR (DHE Tripura, NSP)", appliesVia: "NSP", sourceFormat: "HTML",
    officialUrl: "https://twd.tripura.gov.in/educational-sector",
    rules: [rule(1, "category", "EQ", "st", "", "https://twd.tripura.gov.in/educational-sector"), stateOnly(2, "TR", "https://twd.tripura.gov.in/educational-sector")],
    gaps: ["\"Post Matric Scholarship is being implemented through NSP Portal\"; the state adds a hostel top-up.", "Income limit and amounts are not on the page."],
  },
  (() => {
    const src = "https://scstpmsonline.bihar.gov.in/scstpms2223/pms/faq.aspx";
    return {
      trackerId: "BR1", quality: "partial", slug: "br-post-matric-sc-st", name: "Bihar Post Matric Scholarship (SC/ST)",
      provider: "STATE", stateCode: "BR", source: "State: BR (Bihar PMS portal)", appliesVia: "State portal", sourceFormat: "HTML",
      officialUrl: "https://scstpmsonline.bihar.gov.in/pms/pms_online/Default.aspx",
      documents: ["Income certificate (revenue officer)", "Domicile or residence certificate", "Caste certificate", "College bonafide certificate", "Fee receipt", "Aadhaar-seeded bank account"],
      rules: [
        rule(1, "domicile_state", "EQ", "BR", "\"Not Resident of Bihar\" is a rejection reason", src),
        rule(2, "category", "IN", ["sc", "st"], "BC, EBC, SC or ST as approved by the Government of Bihar", src, true),
      ],
      gaps: ["The FAQ (written for 2019-20 to 2021-22) names BC and EBC too: confirm this scheme's categories.", "Income figure and amounts are missing."],
    };
  })(),
  {
    trackerId: "TG1", quality: "partial", slug: "tg-post-matric-rtf-mtf", name: "Telangana post-matric RTF and MTF",
    provider: "STATE", stateCode: "TG", source: "State: TG (Telangana ePASS)", appliesVia: "State portal", sourceFormat: "HTML",
    officialUrl: "https://telanganaepass.cgg.gov.in/epassonlinelinks.do",
    amountText: "Tuition reimbursement up to ₹35,000 (2014-15 figure)", benefitTypes: ["Tuition fee", "Maintenance allowance"],
    rules: [
      rule(1, "family_income", "LTE", 100000, "\"The Maximum income limit of the parents is Rs.1,00,000/- per annum\" (BC and EBC)",
        "https://www.telangana.gov.in/departments/backward-classes-welfare/0/", true),
      rule(2, "category", "IN", ["bc_a", "bc_b", "bc_c", "bc_d", "bc_e", "ebc"], "\"The Maximum income limit of the parents is Rs.1,00,000/- per annum\" (BC and EBC)",
        "https://www.telangana.gov.in/departments/backward-classes-welfare/0/"),
      stateOnly(3, "TG", "https://telanganaepass.cgg.gov.in/epassonlinelinks.do"),
    ],
    gaps: [
      "Figures are from a 2014-15 department page; ePASS refused the request. Treat as a starting point only.",
      "The row also covers SC, ST and minority students: split by community.",
      "EAMCET rank up to 10,000 gets the full fee.",
    ],
  },
  (() => {
    const src = "https://bcwd.karnataka.gov.in/info-2/Scholarships/Vidyasiri/en";
    return {
      trackerId: "KA2", quality: "partial", slug: "ka-vidyasiri", name: "Vidyasiri",
      provider: "STATE", stateCode: "KA", source: "State: KA (SSP Karnataka)", appliesVia: "State portal", sourceFormat: "HTML", officialUrl: src,
      amountText: "₹1,500 a month for 10 months (₹15,000 a year)", benefitTypes: ["Maintenance allowance"],
      documents: ["Aadhaar-seeded bank account", "Caste certificate", "Income certificate (revenue officer)", "Previous year marksheet (renewals)"],
      rules: [
        rule(1, "domicile_state", "EQ", "KA", "Indian citizen and \"a permanent resident of Karnataka\"", src),
        rule(2, "category", "IN", ["cat_1", "2a", "3a", "3b"], "Category-1 (15% of funds), 2A, 3A, 3B", src),
        rule(3, "family_income", "LTE", 250000, "\"Rs.2.50 lakh for students of Category-I\"; \"Rs. 1.00 lakhs\" for 2A, 3A, 3B", src, true),
        rule(4, "class12_pct", "GTE", 40, "Category-1: 40% fresh, 50% renewal; 2A, 3A, 3B: 50% fresh, 60% renewal", src, true),
      ],
      gaps: [
        "Page last updated April 2021: confirm current amounts.",
        "Income and marks limits differ by category, so they show as \"confirm\".",
        "Not checked by the matcher: not admitted to \"any departmental / government funded student hostel\".",
      ],
    };
  })(),
  (() => {
    const src = "https://bcwd.karnataka.gov.in/info-2/Scholarships/Fee+Concession/en";
    return {
      trackerId: "KA3", quality: "partial", slug: "ka-fee-concession", name: "Karnataka fee concession",
      provider: "STATE", stateCode: "KA", source: "State: KA (SSP Karnataka)", appliesVia: "State portal", sourceFormat: "HTML", officialUrl: src,
      amountText: "Government fees paid to the college", benefitTypes: ["Tuition fee"],
      documents: ["Aadhaar-seeded bank account"],
      rules: [
        rule(1, "family_income", "LTE", 150000, "\"Rs.1.50 lakh for students of Category I\"; Rs. 1.00 lakh for other backward classes", src, true),
        rule(2, "category", "IN", ["cat_1", "2a", "2b", "3a", "3b"], "\"Rs.1.50 lakh for students of Category I\"; Rs. 1.00 lakh for other backward classes", src),
        stateOnly(3, "KA", src),
      ],
      gaps: ["For colleges \"affiliated to the statutory universities of Karnataka\".", "Marks, admission route and portal are not stated."],
    };
  })(),
  (() => {
    const src = "https://www.tatacapital.com/content/dam/tata-capital/pdf/media-center/press-release/2023/Press-release-Tata-Capital-invites-applications-for-the-Pankh-Scholarship-Program-for-academic-year-2023-24.pdf";
    return {
      trackerId: "P4", quality: "partial", slug: "tata-capital-pankh", name: "Tata Capital Pankh Scholarship",
      provider: "PRIVATE", source: "Private: CSR or company", appliesVia: "Scheme's own portal", sourceFormat: "PDF",
      officialUrl: "https://www.tatacapital.com/content/dam/tata-capital/pdf/media-center/press-release/2025/tata-capital-drives-inclusive-education-with-pankh-scholarship-24-01.pdf",
      amountText: "Up to 80% of tuition, or ₹10,000 to ₹12,000", benefitTypes: ["Tuition fee", "Lump sum"],
      rules: [
        rule(1, "class12_pct", "GTE", 60, "\"should be at least 60%\" in the qualifying exam (2023-24)", src),
        rule(2, "family_income", "LTE", 250000, "\"should not exceed INR 2,50,000 from all sources\" (2023-24)", src),
      ],
      gaps: ["Rules are from the 2023-24 cycle: confirm 2026-27 on the Buddy4Study listing.", "\"The applications open from September each year.\""],
    };
  })(),
  (() => {
    const src = "https://ffe.org/awoo-a-world-of-opportunity-foundation/";
    return {
      trackerId: "P7", quality: "partial", slug: "foundation-for-excellence", name: "Foundation for Excellence Scholarship",
      provider: "PRIVATE", source: "Private: trust or foundation", appliesVia: "Scheme's own portal", sourceFormat: "HTML", officialUrl: src,
      rules: [
        rule(1, "entrance_exam", "IN", ["jee_main", "jee_adv"], "B.E./B.Tech by JEE All India Rank; IITs use JEE (Advanced) rank up to 30,000", src),
        rule(2, "entrance_rank", "LTE", 10000,
          "the \"Tamil Nadu, Andhra Pradesh, Maharashtra, Telangana and Karnataka\" row allows rank up to 10,000; IITs use JEE (Advanced) rank up to 30,000", src, true),
      ],
      gaps: [
        "The rank limit depends on the state and on IIT vs other colleges, so it shows as \"confirm\".",
        "The income figure sits in a tab that could not be read; amount, renewal, documents and deadline also missing.",
        "The tracker's old ffe.org/?p=10511 link is replaced by the AWOO page.",
      ],
    };
  })(),
  (() => {
    const src = "https://www.siemens.com/en-us/company/sustainability/corporate-citizenship-india/scholarship-program/";
    return {
      trackerId: "P8", quality: "partial", slug: "siemens-scholarship", name: "Siemens Scholarship Program",
      provider: "PRIVATE", source: "Private: CSR or company", appliesVia: "Scheme's own portal", sourceFormat: "HTML", officialUrl: src,
      amountText: "Tuition fees and allowances for books, hostel and extra classes", benefitTypes: ["Tuition fee", "Hostel allowance"],
      rules: [
        ...firstYearOrRenewal(1, "\"first-year engineering students in India\"", src, false, "\"subject to students clearing all subjects and scoring first class\""),
        rule(2, "institution_type", "IN", ["govt"], "Students from \"Government Colleges\" across 28 states", src),
      ],
      gaps: [
        "No income figure on the page (\"economically disadvantaged engineering students\").",
        "\"Applications to Siemens Scholarship Program 2026-27 are now closed.\"",
        "50% of places reserved for girls.",
      ],
    };
  })(),
  {
    trackerId: "P9", quality: "partial", slug: "ongc-foundation-merit", name: "ONGC Foundation Scholarship for Meritorious Students",
    provider: "PRIVATE", source: "Private: CSR or company", appliesVia: "Scheme's own portal", sourceFormat: "HTML", officialUrl: "https://ongcscholar.org/",
    rules: [
      rule(1, "category", "IN", ["ews", "sc", "st", ...OBC_LIKE],
        "\"meritorious students from Economically Weaker Sections, SC/ST and OBC communities\"", "https://www.ongcfoundation.org/scholarship/"),
    ],
    gaps: [
      "The category rule lists each state's OBC names: check the mapping.",
      "Marks, income limit, amount, number and dates were not found: find the current notification.",
      "50% of scholarships reserved for female candidates.",
    ],
  },
];
