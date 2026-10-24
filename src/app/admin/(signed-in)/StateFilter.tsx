"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATES } from "@/lib/states";

export function StateFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <>
      <label htmlFor="state-filter" className="sr-only">
        State
      </label>
      <select
        id="state-filter"
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value) next.set("state", e.target.value);
          else next.delete("state");
          router.push(`${pathname}?${next}`);
        }}
        className="min-h-10 rounded-full border border-field bg-white px-3 text-sm text-ink"
      >
        <option value="">All states</option>
        {STATES.map((s) => (
          <option key={s.code} value={s.code}>
            {s.name}
          </option>
        ))}
      </select>
    </>
  );
}
