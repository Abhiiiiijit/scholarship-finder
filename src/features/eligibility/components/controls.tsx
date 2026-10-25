"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import type { Option } from "@/features/eligibility/lib/labels";

// The phone-sized form controls from the screen spec: Chip / OptionButton groups, TextField and
// SelectField. Touch targets are at least 44px.

const choiceOn = "border-navy bg-navy text-white";
const choiceOff = "border-field bg-white text-ink hover:border-navy";

export function OptionButton({
  label,
  selected,
  onClick,
  align = "center",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  align?: "left" | "center";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-12 rounded-[10px] border px-4 py-2 text-[15px] leading-5 ${
        align === "left" ? "text-left" : "text-center"
      } ${selected ? choiceOn : choiceOff}`}
    >
      {label}
    </button>
  );
}

function ChipButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-4 text-[15px] ${selected ? choiceOn : choiceOff}`}
    >
      {label}
    </button>
  );
}

function Group({ legend, hint, children }: { legend: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      {children}
      {hint && <div className="text-[13px] leading-[18px] text-slate">{hint}</div>}
    </fieldset>
  );
}

const LAYOUTS = {
  chips: "flex flex-wrap gap-2",
  list: "flex flex-col gap-2",
  grid2: "grid grid-cols-2 gap-2",
  grid3: "grid grid-cols-3 gap-2",
} as const;

// Single choice. Tapping the chosen option again clears it back to unknown.
export function ChoiceGroup<V extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
  layout = "chips",
}: {
  legend: string;
  hint?: ReactNode;
  options: readonly Option<V>[];
  value: V | undefined;
  onChange: (v: V | undefined) => void;
  layout?: keyof typeof LAYOUTS;
}) {
  return (
    <Group legend={legend} hint={hint}>
      <div className={LAYOUTS[layout]}>
        {options.map((o) => {
          const selected = o.value === value;
          const pick = () => onChange(selected ? undefined : o.value);
          return layout === "chips" ? (
            <ChipButton key={o.value} label={o.label} selected={selected} onClick={pick} />
          ) : (
            <OptionButton key={o.value} label={o.label} selected={selected} onClick={pick} align={layout === "list" ? "left" : "center"} />
          );
        })}
      </div>
    </Group>
  );
}

// Multiple choice where "none" excludes everything else.
export function CheckList<V extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly Option<V>[];
  value: V[] | undefined;
  onChange: (v: V[] | undefined) => void;
}) {
  const chosen = value ?? [];
  const toggle = (v: V) => {
    if (chosen.includes(v)) {
      const next = chosen.filter((c) => c !== v);
      return onChange(next.length ? next : undefined);
    }
    onChange(v === "none" ? [v] : [...chosen.filter((c) => c !== "none"), v]);
  };
  return (
    <Group legend={legend}>
      <div className="flex flex-col gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] border border-field bg-white px-4 py-2 text-[15px] leading-5 has-checked:border-navy"
          >
            <input
              type="checkbox"
              checked={chosen.includes(o.value)}
              onChange={() => toggle(o.value)}
              className="size-5 flex-none accent-navy"
            />
            {o.label}
          </label>
        ))}
      </div>
    </Group>
  );
}

const box =
  "flex h-12 items-center gap-1.5 rounded-[10px] border bg-white px-3 focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/20";

export function TextField({
  label,
  hint,
  error,
  prefix,
  suffix,
  ...input
}: { label: string; hint?: ReactNode; error?: string; prefix?: string; suffix?: string } & Omit<
  ComponentProps<"input">,
  "prefix"
>) {
  const id = useId();
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className={`${box} ${error ? "border-warn" : "border-field"}`}>
        {prefix && <span className="text-base text-slate">{prefix}</span>}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
          {...input}
        />
        {suffix && <span className="text-base text-slate">{suffix}</span>}
      </div>
      {note && (
        <div id={`${id}-note`} className={`text-[13px] leading-[18px] ${error ? "text-warn" : "text-slate"}`}>
          {note}
        </div>
      )}
    </div>
  );
}

export type SelectGroup = { label?: string; options: Option[] };

export function SelectField({
  label,
  hint,
  groups,
  placeholder,
  ...select
}: { label: string; hint?: ReactNode; groups: SelectGroup[]; placeholder?: string } & ComponentProps<"select">) {
  const id = useId();
  const options = (g: SelectGroup) =>
    g.options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        aria-describedby={hint ? `${id}-note` : undefined}
        className="h-12 rounded-[10px] border border-field bg-white px-3 text-base text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {groups.map((g, i) =>
          g.label ? (
            <optgroup key={g.label} label={g.label}>
              {options(g)}
            </optgroup>
          ) : (
            <Fragmentish key={i}>{options(g)}</Fragmentish>
          ),
        )}
      </select>
      {hint && (
        <div id={`${id}-note`} className="text-[13px] leading-[18px] text-slate">
          {hint}
        </div>
      )}
    </div>
  );
}

function Fragmentish({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
