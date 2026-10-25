"use client";

import { useId, useState, type ReactNode } from "react";

// One optional question, folded until tapped. `answer` shows what is saved while folded.
export function UnlockRow({
  title,
  detail,
  answer,
  children,
  defaultOpen = false,
}: {
  title: string;
  detail: string;
  answer?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-b border-line-soft last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="flex min-h-[60px] w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
      >
        <span className="text-[15px] leading-5">
          <b className="font-semibold">{title}</b>
          <br />
          <span className={`text-[13px] ${answer ? "text-pass" : "text-slate"}`}>{answer ?? detail}</span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="flex-none text-slate">
          {open ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
        </svg>
      </button>
      {open && (
        <div id={id} className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
