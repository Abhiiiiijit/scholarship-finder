"use client";

import Link from "next/link";
import { hasAnswers } from "@/lib/student/answers";
import { useAnswers } from "@/lib/student/use-answers";

// "Check my eligibility", or "Continue where you left off" when this phone has saved answers.
export function StartButton() {
  const [profile] = useAnswers();
  const resume = hasAnswers(profile);
  const href = resume && profile?.domicile_state ? "/check/state" : "/check/basics";
  return (
    <Link
      href={href}
      className="flex h-[52px] items-center justify-center rounded-xl bg-navy text-[17px] font-semibold text-white no-underline hover:bg-ink"
    >
      {resume ? "Continue where you left off" : "Check my eligibility"}
    </Link>
  );
}
