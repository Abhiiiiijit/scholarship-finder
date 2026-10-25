import type { RuleOutcome } from "@/domain/match";

const ICONS: Record<RuleOutcome | "confirm", { label: string; color: string; path: string }> = {
  pass: { label: "Pass", color: "text-pass", path: "M5 12.5l4.5 4.5L19 7.5" },
  fail: { label: "Fail", color: "text-warn", path: "M6 6l12 12M18 6L6 18" },
  unknown: { label: "Unknown", color: "text-info", path: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01" },
  confirm: { label: "Confirm on the official site", color: "text-info", path: "M12 8v5M12 16h.01" },
};

// `label` replaces the icon's English name for screen readers, e.g. in the student's language.
export function RuleRow({
  result,
  text,
  detail,
  label,
}: {
  result: RuleOutcome | "confirm";
  text: string;
  detail?: string;
  label?: string;
}) {
  const icon = ICONS[result];
  return (
    <li className="flex gap-2 text-sm leading-5">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={label ?? icon.label}
        className={`mt-px flex-none ${icon.color}`}
      >
        <path d={icon.path} />
      </svg>
      <span>
        {text}
        {detail && <span className="block text-[13px] text-slate">{detail}</span>}
      </span>
    </li>
  );
}
