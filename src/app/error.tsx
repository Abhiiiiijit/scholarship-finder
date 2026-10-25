"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Brand, Column, Screen } from "@/features/eligibility";

// Any screen that throws lands here instead of the default Next.js error page.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Screen>
      <Column className="flex-1 gap-5 pt-5 pb-8">
        <Brand />
        <div className="flex flex-col gap-2 pt-10">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold">Something went wrong</h1>
          <p className="m-0 text-[15px] leading-[22px] text-slate">
            This page couldn&apos;t load. Your answers are saved on this phone, so nothing is lost.
          </p>
        </div>
        <button
          type="button"
          onClick={() => retry()}
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-navy text-[17px] font-semibold text-white hover:bg-ink"
        >
          Try again
        </button>
        <Link href="/" className="self-center text-sm font-semibold text-navy">
          Go to the start
        </Link>
      </Column>
    </Screen>
  );
}
