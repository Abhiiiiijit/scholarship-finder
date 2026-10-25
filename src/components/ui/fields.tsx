import type { ComponentProps, ReactNode } from "react";

// TextField and SelectField from the screen spec, sized for the admin screens.

const control =
  "h-[42px] w-full rounded-lg border bg-white px-2.5 text-[15px] text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/20";

function Shell({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <span id={`${id}-hint`} className={`text-[13px] leading-[18px] ${error ? "text-warn" : "text-slate"}`}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

export function TextField({
  fieldId,
  label,
  hint,
  error,
  ...input
}: { fieldId: string; label: string; hint?: string; error?: string } & ComponentProps<"input">) {
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-hint` : undefined}
        className={`${control} ${error ? "border-warn" : "border-field"}`}
        {...input}
      />
    </Shell>
  );
}

export type SelectGroup = { label?: string; options: { value: string; label: string }[] };

export function SelectField({
  fieldId,
  label,
  hint,
  error,
  groups,
  placeholder,
  ...select
}: {
  fieldId: string;
  label: string;
  hint?: string;
  error?: string;
  groups: SelectGroup[];
  placeholder?: string;
} & ComponentProps<"select">) {
  const options = (g: SelectGroup) =>
    g.options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
  return (
    <Shell id={fieldId} label={label} hint={hint} error={error}>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={`${control} ${error ? "border-warn" : "border-field"}`}
        {...select}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {groups.map((g, i) =>
          g.label ? (
            <optgroup key={g.label} label={g.label}>
              {options(g)}
            </optgroup>
          ) : (
            <OptionsFragment key={i}>{options(g)}</OptionsFragment>
          ),
        )}
      </select>
    </Shell>
  );
}

function OptionsFragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
