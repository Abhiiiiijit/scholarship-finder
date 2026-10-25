import Link from "next/link";
import { Brand, Column, Screen } from "@/features/eligibility";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Screen>
      <Column width="narrow" className="flex-1 gap-5 pt-5 pb-8">
        <Brand />
        <div className="flex flex-col gap-2 pt-10">
          <h1 className="m-0 text-2xl leading-[30px] font-semibold">This page doesn&apos;t exist</h1>
          <p className="m-0 text-[15px] leading-[22px] text-slate">The link may be old or mistyped. Your saved answers are still on this phone.</p>
        </div>
        <Link
          href="/"
          className="flex h-[52px] items-center justify-center rounded-xl bg-navy text-[17px] font-semibold text-white no-underline hover:bg-ink"
        >
          Go to the start
        </Link>
      </Column>
    </Screen>
  );
}
