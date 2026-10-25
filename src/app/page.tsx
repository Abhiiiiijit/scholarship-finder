import { Brand, Column, Footnote, Screen, StartButton } from "@/features/eligibility";
import { STATES } from "@/domain/states";

// S01 Landing.

const TRUST = [
  {
    title: "Every rule quoted",
    body: "Word for word from the official page, with the link.",
    icon: "M7 8h10M7 12h7M5 4h14v16l-4-3H5z",
  },
  {
    title: "Checked by a person",
    body: "Each scheme shows when it was last verified. Nothing older than 90 days is shown.",
    icon: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2",
  },
  {
    title: "Tells you why not",
    body: "“Income ₹1 L over the ₹8 L limit”, not just a missing result.",
    icon: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 11v5M12 8h.01",
  },
];

function listNames(names: string[]) {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export default function Landing() {
  return (
    <Screen>
      <Column className="flex-1 gap-7 pt-5 pb-6">
        <header className="flex items-center justify-between">
          <Brand />
          <span className="rounded-full border border-disabled px-2.5 py-1 text-xs leading-4 text-slate">B.E./B.Tech · all states</span>
        </header>

        <div className="flex flex-col gap-3.5 pt-4">
          <h1 className="m-0 text-[34px] leading-10 font-semibold tracking-tight text-balance">
            Which scholarships can you actually get?
          </h1>
          <p className="m-0 text-base leading-6 text-slate">
            Pick your state and answer about 10 questions. See every central, AICTE, state and private scheme you qualify
            for, and the exact rule behind each answer.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <StartButton />
          <div className="text-center text-[13px] leading-[18px] text-slate">
            About 2 minutes · no sign-up · answers stay on this phone
          </div>
        </div>

        <ul className="m-0 flex list-none flex-col rounded-[14px] border border-line bg-white p-0">
          {TRUST.map((t) => (
            <li key={t.title} className="flex items-start gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-none text-navy">
                <path d={t.icon} />
              </svg>
              <div className="text-[15px] leading-[21px]">
                <b className="font-semibold">{t.title}</b>
                <br />
                <span className="text-slate">{t.body}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-1.5 text-[13px] leading-[19px] text-slate">
          <span>
            State schemes go live one state at a time, starting with the {STATES.length} states and UTs whose rules we have
            confirmed: {listNames(STATES.map((s) => s.name))}.
          </span>
          <span>Elsewhere you still get central, AICTE and private schemes.</span>
        </div>

        <Footnote />
      </Column>
    </Screen>
  );
}
