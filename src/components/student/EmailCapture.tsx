"use client";

import { useId, useState, type FormEvent } from "react";

// Email sign-up for "notify me" and deadline reminders. Whether Paatra stores anything for these
// is still an open decision, so for now this is a stub: it checks the address and says plainly
// that nothing was saved or sent. Nothing leaves the phone.
export function EmailCapture({ label, detail, buttonLabel = "Notify me" }: { label: string; detail?: string; buttonLabel?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "invalid" | "stub">("idle");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setState(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "stub" : "invalid");
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-2.5 rounded-[14px] bg-info-tint p-4">
      <label htmlFor={id} className="text-[15px] leading-[21px] font-semibold">
        {label}
      </label>
      {detail && <p className="m-0 text-[13px] leading-[18px] text-muted">{detail}</p>}
      {state === "stub" ? (
        <p role="status" className="m-0 text-sm leading-5 text-info">
          Email alerts aren&apos;t switched on yet, so we haven&apos;t saved your address or sent anything. Check back here
          for now.
        </p>
      ) : (
        <>
          <input
            id={id}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setState("idle");
            }}
            aria-invalid={state === "invalid" ? true : undefined}
            className={`h-12 rounded-[10px] border bg-white px-3 text-base text-ink outline-none focus:border-navy ${
              state === "invalid" ? "border-warn" : "border-field"
            }`}
          />
          {state === "invalid" && <div className="text-[13px] text-warn">Enter an email address like you@example.com</div>}
          <button
            type="submit"
            className="min-h-12 rounded-xl border border-navy bg-white text-base font-semibold text-navy hover:bg-ground"
          >
            {buttonLabel}
          </button>
        </>
      )}
    </form>
  );
}
