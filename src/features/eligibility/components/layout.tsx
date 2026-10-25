import Link from "next/link";
import type { ReactNode } from "react";

// Page chrome for the student screens: a column on the grey ground, StepHeader and StickyCTA from
// the screen spec, and the Paatra mark. Phones get the designed single column; wider screens get a
// wider column that the views split into a sidebar and a main area or a grid of cards.

export function Screen({ children }: { children?: ReactNode }) {
  return <div className="flex flex-1 flex-col bg-ground text-ink">{children}</div>;
}

const WIDTHS = {
  // Short messages (error, not found) read best at phone width on any screen.
  narrow: "max-w-md",
  wide: "max-w-6xl",
} as const;

export function Column({
  children,
  className = "",
  width = "wide",
}: {
  children: ReactNode;
  className?: string;
  width?: keyof typeof WIDTHS;
}) {
  return <div className={`mx-auto flex w-full ${WIDTHS[width]} flex-col px-5 sm:px-8 ${className}`}>{children}</div>;
}

// Basics and state questions: the heading and intro sit beside the form on a laptop, above it on a phone.
export function FormLayout({ intro, children }: { intro: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[22px] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,40rem)] lg:items-start lg:gap-16">
      <div className="flex flex-col gap-1.5 lg:sticky lg:top-6 lg:gap-3">{intro}</div>
      <div className="flex flex-col gap-[22px]">{children}</div>
    </div>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink no-underline">
      {/* eslint-disable-next-line @next/next/no-img-element -- a 28px SVG mark needs no optimising */}
      <img src="/brand/mark-light.svg" alt="" width={28} height={28} />
      Paatra
    </Link>
  );
}

export function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function StepHeader({ label, progress, backHref }: { label: string; progress: number; backHref: string }) {
  return (
    <header className="flex flex-col gap-3 pt-4">
      <div className="flex items-center gap-2">
        <Link href={backHref} aria-label="Back" className="-ml-3 flex size-11 items-center justify-center text-ink">
          <BackIcon />
        </Link>
        <div className="text-sm text-slate">{label}</div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-navy" style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}

const cta =
  "flex h-[52px] w-full items-center justify-center rounded-xl bg-navy text-[17px] font-semibold text-white no-underline hover:bg-ink";

export function StickyCTA({
  label,
  href,
  onClick,
  disabled,
  note,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div className="sticky bottom-0 border-t border-line bg-white pt-4 pb-6 md:py-4">
      <Column className="gap-2 md:flex-row-reverse md:items-center md:justify-between md:gap-6">
        {href && !disabled ? (
          <Link href={href} onClick={onClick} className={`${cta} md:w-80`}>
            {label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${cta} md:w-80 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted`}
          >
            {label}
          </button>
        )}
        {note && <div className="text-center text-xs leading-4 text-slate md:text-left">{note}</div>}
      </Column>
    </div>
  );
}

export function Footnote({ children }: { children?: ReactNode }) {
  return (
    <p className="m-0 max-w-3xl text-xs leading-[17px] text-slate">
      {children ?? "Eligibility is decided by the scheme. Always confirm on the official page before applying."}
    </p>
  );
}
