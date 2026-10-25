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
      <Column className="flex-1 gap-7 pt-5 pb-6 lg:gap-10 lg:pb-12">
        <header className="flex items-center justify-between">
          <Brand />
          <span className="rounded-full border border-disabled px-2.5 py-1 text-xs leading-4 text-slate">B.E./B.Tech · all states</span>
        </header>

        {/* Phone: one column in the designed order. Laptop: the pitch and start button beside what makes it trustworthy. */}
        <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16 lg:pt-10">
          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3.5 pt-4 lg:pt-0">
              <h1 className="m-0 text-[34px] leading-10 font-semibold tracking-tight text-balance md:text-[44px] md:leading-[52px] lg:text-[52px] lg:leading-[60px]">
                Which scholarships can you actually get?
              </h1>
              <p className="m-0 max-w-2xl text-base leading-6 text-slate md:text-lg md:leading-7">
                Pick your state and answer about 10 questions. See every central, AICTE, state and private scheme you
                qualify for, and the exact rule behind each answer.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 md:max-w-sm">
              <StartButton />
              <div className="text-center text-[13px] leading-[18px] text-slate">
                About 2 minutes · no sign-up · answers stay on this phone
              </div>
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
        </div>

        <div className="flex max-w-3xl flex-col gap-1.5 text-[13px] leading-[19px] text-slate">
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
