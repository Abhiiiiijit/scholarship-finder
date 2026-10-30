// The 16 states and UTs in the MVP (Matches or Corrected in the PRD's verification log), with the
// state questions from the screen spec's "State-specific values". A rule can only use a state key
// its own state defines, e.g. MH.cap_admission on a Maharashtra scheme.

export interface StateQuestion {
  key: string;
  label: string;
  // A plain-language line under the question: the full form of any short form, and where to look.
  hint?: string;
  options: { value: string; label: string }[];
  // Asked only for these categories; for others S03 shows a grey note instead.
  onlyFor?: string[];
}

export interface StateConfig {
  code: string;
  name: string;
  portal: string;
  categories: { value: string; label: string }[];
  questions: StateQuestion[];
}

const opts = (pairs: string) =>
  pairs.split(" · ").map((p) => {
    const [value, ...label] = p.split(" ");
    return { value, label: label.join(" ") };
  });
const cats = (labels: string) =>
  labels.split(" · ").map((label) => ({ value: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label }));

const YES_NO = opts("yes Yes · no No");
const YES_NO_UNSURE = opts("yes Yes · no No · unknown Not sure");
const YES_NO_APPLIED = opts("yes Yes · no No · applied Applied for it");
const HAVE = opts("yes Have one · no Don't have one");
const STAY = opts("hostel Hostel · day Day scholar");
const NATIONAL = "General · SC · ST · OBC · EWS";

const q = (key: string, label: string, options = YES_NO_UNSURE, onlyFor?: string[]): StateQuestion =>
  onlyFor ? { key, label, options, onlyFor } : { key, label, options };
const hinted = (question: StateQuestion, hint: string): StateQuestion => ({ ...question, hint });
const RESIDENCE_HINT = "Proves you are a permanent resident of the state. Your tehsil or district office issues it.";
const residence = (label: string, hint = RESIDENCE_HINT) => hinted(q("residence", label, YES_NO_APPLIED), hint);

export const STATES: StateConfig[] = [
  {
    code: "BR", name: "Bihar", portal: "Bihar PMS portal", categories: cats("General · SC · ST · BC · EBC"),
    questions: [
      residence("Bihar residential certificate"),
      hinted(
        q("ugeac", "Admitted through UGEAC counselling"),
        "UGEAC is Bihar's Under Graduate Engineering Admission Counselling, run by BCECEB using JEE Main ranks.",
      ),
    ],
  },
  {
    code: "DL", name: "Delhi", portal: "Institution, e-District", categories: cats(NATIONAL),
    questions: [
      hinted(
        q("delhi_univ", "Studying at", opts("dtu DTU · nsut NSUT · iiitd IIIT-Delhi · igdtuw IGDTUW · dseu DSEU · other Another college")),
        "Delhi Technological University, Netaji Subhas University of Technology, IIIT-Delhi, Indira Gandhi Delhi Technical University for Women, Delhi Skill and Entrepreneurship University.",
      ),
      hinted(
        q("nfsa_card", "NFSA ration card", YES_NO),
        "A ration card under the National Food Security Act (NFSA). The card itself says NFSA.",
      ),
    ],
  },
  {
    code: "GA", name: "Goa", portal: "Bursary 2.0, CM Scholarship Portal", categories: cats("General · SC · ST · OBC"),
    questions: [residence("Goa residence certificate"), q("goa_10_12", "Passed Class 10 and 12 in Goa", YES_NO)],
  },
  {
    code: "HR", name: "Haryana", portal: "Har-Chhatravratti", categories: cats("General · SC · BC-A · BC-B · EWS"),
    questions: [
      residence("Haryana resident certificate"),
      hinted(
        q("ppp", "Parivar Pehchan Patra (family ID)", HAVE),
        "Haryana's family ID card. It lists everyone in the family and the family income.",
      ),
    ],
  },
  {
    code: "HP", name: "Himachal Pradesh", portal: "HP ePASS", categories: cats("General · SC · ST · OBC"),
    questions: [residence("Himachali bonafide certificate")],
  },
  {
    code: "JK", name: "Jammu & Kashmir", portal: "AICTE portal (SSS)", categories: cats(NATIONAL),
    questions: [
      residence("J&K domicile certificate"),
      q("study_outside", "Studying outside J&K", YES_NO),
      hinted(
        q("board12", "Class 12 board", opts("jkbose JKBOSE · cbse CBSE · other Other")),
        "JKBOSE is the J&K Board of School Education.",
      ),
    ],
  },
  {
    code: "KA", name: "Karnataka", portal: "SSP Karnataka", categories: cats("GM · Cat-1 · 2A · 2B · 3A · 3B · SC · ST"),
    questions: [
      residence("Karnataka residence certificate"),
      hinted(
        q("kea_seat", "Seat allotted by KEA through KCET", opts("yes Yes · no No, management or COMEDK · unknown Not sure")),
        "KEA (Karnataka Examinations Authority) gives seats by KCET (Karnataka Common Entrance Test) rank. Your KEA allotment letter shows it.",
      ),
      hinted(
        q("rd_certificates", "Caste and income certificates with RD numbers", YES_NO_APPLIED),
        "Karnataka caste and income certificates from the Nadakacheri carry an RD number. SSP forms ask for it.",
      ),
      q("stay", "Hostel or day scholar", STAY),
    ],
  },
  {
    code: "LA", name: "Ladakh", portal: "AICTE portal (SSS)", categories: cats("General · SC · ST · OBC"),
    questions: [residence("Ladakh resident certificate"), q("study_outside", "Studying outside Ladakh", YES_NO)],
  },
  {
    code: "LD", name: "Lakshadweep", portal: "NSP", categories: cats("General · ST"),
    questions: [
      residence("Lakshadweep residence certificate"),
      hinted(
        q("csab_seat", "Admitted to a CSAB reserved seat"),
        "CSAB (Central Seat Allocation Board) fills seats kept for students from the North-East and some Union Territories, including Lakshadweep.",
      ),
    ],
  },
  {
    code: "MP", name: "Madhya Pradesh", portal: "MP Scholarship Portal", categories: cats(NATIONAL),
    questions: [
      residence("MP domicile certificate"),
      hinted(
        q("samagra_id", "Samagra ID", HAVE),
        "Madhya Pradesh's family and member ID, used on most MP government forms.",
      ),
      q("board12", "Class 12 board", opts("mp MP Board · cbse CBSE · icse ICSE · other Other")),
    ],
  },
  {
    code: "MH", name: "Maharashtra", portal: "MahaDBT", categories: cats("Open · SC · ST · OBC · VJNT · SBC · EWS · SEBC"),
    questions: [
      residence("Maharashtra domicile certificate"),
      hinted(
        q("cap_admission", "Admitted through CAP", opts("yes Yes, through CAP rounds · no No, institute or management quota · unknown Not sure")),
        "CAP is the Centralised Admission Process: the State CET Cell's seat rounds after MHT-CET or JEE Main. Your allotment letter names the CAP round.",
      ),
      hinted(
        q("caste_validity", "Caste validity certificate", YES_NO_APPLIED, ["sc", "st", "obc", "vjnt", "sbc", "sebc"]),
        "Separate from your caste certificate: the Caste Scrutiny Committee issues it after checking that certificate.",
      ),
      hinted(
        q("ncl", "Non-creamy layer certificate", YES_NO_APPLIED, ["obc", "vjnt", "sbc"]),
        "Shows your family is not in the better-off “creamy layer” of your category, judged mainly by income. Your tehsil or SDO office issues it.",
      ),
      q("stay", "Hostel or day scholar", STAY),
    ],
  },
  {
    code: "OD", name: "Odisha", portal: "SSP Odisha", categories: cats("General · SC · ST · SEBC"),
    questions: [
      residence("Odisha resident certificate"),
      hinted(
        q("ojee", "Admitted through OJEE"),
        "OJEE is the Odisha Joint Entrance Examination. Its counselling also gives seats by JEE Main rank.",
      ),
      q("studied_in_od", "Passed Class 10 and 12 in Odisha", YES_NO),
    ],
  },
  {
    code: "SK", name: "Sikkim", portal: "Sikkim scholarship portals", categories: cats("General · SC · ST · OBC"),
    questions: [
      residence("Sikkim Subject or Certificate of Identification"),
      hinted(
        q("state_quota", "Admitted on a Sikkim state quota seat"),
        "A seat kept for Sikkim students and filled by the Sikkim government, not by open counselling.",
      ),
    ],
  },
  {
    code: "TN", name: "Tamil Nadu", portal: "Department pages", categories: cats("OC · BC · BCM · MBC/DNC · SC · SCA · ST"),
    questions: [
      residence("Tamil Nadu nativity certificate"),
      hinted(
        q("tnea", "Admitted through TNEA"),
        "TNEA is Tamil Nadu Engineering Admissions, the state's online counselling for engineering seats.",
      ),
      hinted(
        q("first_graduate", "First graduate in family", YES_NO),
        "No one in your family has a degree yet. The tahsildar issues a first graduate certificate.",
      ),
      q("govt_school_6_12", "Studied Class 6–12 in a TN government school", YES_NO),
    ],
  },
  {
    code: "TG", name: "Telangana", portal: "Telangana ePASS", categories: cats("OC · EBC · BC-A · BC-B · BC-C · BC-D · BC-E · SC · ST"),
    questions: [
      residence(
        "Telangana local status",
        "Set by where you studied in the years up to Class 12. Your TG EAPCET allotment letter shows your local area.",
      ),
      hinted(
        q("convener_seat", "Convener quota seat through TG EAPCET", opts("yes Yes · no No, management quota · unknown Not sure")),
        "Convener quota seats are given in TG EAPCET (Telangana's engineering entrance test) counselling. Management (Category B) seats are not.",
      ),
      hinted(
        q("ration_card", "Food security (ration) card", YES_NO),
        "Telangana's Food Security Card (FSC), the ration card for low-income families.",
      ),
    ],
  },
  {
    code: "TR", name: "Tripura", portal: "DHE Tripura, NSP", categories: cats("General · SC · ST · OBC"),
    questions: [
      residence("Permanent resident certificate (PRC)", "Tripura's proof that you are a permanent resident. The SDM office issues it."),
      hinted(
        q("tbjee", "Admitted through TBJEE counselling"),
        "TBJEE is the Tripura Board of Joint Entrance Examination. It runs counselling for engineering seats in Tripura.",
      ),
    ],
  },
];

export const STATE_BY_CODE = new Map(STATES.map((s) => [s.code, s]));

// States and UTs whose own schemes are not checked yet: students there see central, AICTE and
// private schemes only (S04). A state moves to STATES once its rules are confirmed.
export const OTHER_STATES: { code: string; name: string }[] = [
  ["AN", "Andaman & Nicobar Islands"], ["AP", "Andhra Pradesh"], ["AR", "Arunachal Pradesh"], ["AS", "Assam"],
  ["CH", "Chandigarh"], ["CT", "Chhattisgarh"], ["DH", "Dadra & Nagar Haveli and Daman & Diu"], ["GJ", "Gujarat"],
  ["JH", "Jharkhand"], ["KL", "Kerala"], ["MN", "Manipur"], ["ML", "Meghalaya"], ["MZ", "Mizoram"],
  ["NL", "Nagaland"], ["PY", "Puducherry"], ["PB", "Punjab"], ["RJ", "Rajasthan"], ["UK", "Uttarakhand"],
  ["UP", "Uttar Pradesh"], ["WB", "West Bengal"],
].map(([code, name]) => ({ code, name }));

export const NATIONAL_CATEGORIES = cats(NATIONAL);

export function stateName(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return STATE_BY_CODE.get(code)?.name ?? OTHER_STATES.find((s) => s.code === code)?.name;
}

// The category chips a student sees: the state's own list, or the national list elsewhere.
export function categoriesFor(code: string | null | undefined) {
  return (code && STATE_BY_CODE.get(code)?.categories) || NATIONAL_CATEGORIES;
}

export function stateFieldKeys(code: string | null | undefined): string[] {
  const state = code ? STATE_BY_CODE.get(code) : undefined;
  return state ? state.questions.map((qq) => `${state.code}.${qq.key}`) : [];
}
