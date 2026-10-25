import Link from "next/link";
import type { ReactNode } from "react";

// Page chrome for the student screens: a phone-width column on the grey ground, StepHeader and
// StickyCTA from the screen spec, and the Paatra mark.

export function Screen({ children }: { children?: ReactNode }) {
  return <div className="flex flex-1 flex-col bg-ground text-ink">{children}</div>;
}

export function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto flex w-full max-w-md flex-col px-5 ${className}`}>{children}</div>;
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
    <div className="sticky bottom-0 border-t border-line bg-white pt-4 pb-6">
      <Column className="gap-2">
        {href && !disabled ? (
          <Link href={href} onClick={onClick} className={cta}>
            {label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${cta} disabled:cursor-not-allowed disabled:bg-disabled disabled:text-muted`}
          >
            {label}
          </button>
        )}
        {note && <div className="text-center text-xs leading-4 text-slate">{note}</div>}
      </Column>
    </div>
  );
}

export function Footnote({ children }: { children?: ReactNode }) {
  return (
    <p className="m-0 text-xs leading-[17px] text-slate">
      {children ?? "Eligibility is decided by the scheme. Always confirm on the official page before applying."}
    </p>
  );
}
