import Link from "next/link";

const base = "inline-flex min-h-10 items-center rounded-full border px-3.5 text-sm";
const on = "border-navy bg-navy text-on-fill";
const off = "border-field bg-surface text-ink hover:border-navy";

export function ChipLink({ label, selected, href }: { label: string; selected: boolean; href: string }) {
  return (
    <Link href={href} aria-current={selected ? "page" : undefined} className={`${base} ${selected ? on : off}`}>
      {label}
    </Link>
  );
}

export function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`${base} ${selected ? on : off}`}>
      {label}
    </button>
  );
}
