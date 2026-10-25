"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { TextField } from "./controls";

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const INCOME_MAX = 99_99_99_999;

// "900000" -> "9,00,000"; anything but digits is dropped as the student types.
export function groupIndian(digits: string): string {
  const d = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return d ? inr.format(Number(d)) : "";
}

// Rupees, whole numbers, shown in Indian grouping.
export function IncomeField({
  label,
  hint,
  value,
  onChange,
}: {
  label?: string;
  hint?: ReactNode;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const t = useTranslations("fields");
  const [text, setText] = useState(value === undefined ? "" : groupIndian(String(value)));
  const [error, setError] = useState<string>();
  // Follow outside changes (an undo, a QuestionCard) without fighting the student's typing.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value === undefined ? "" : groupIndian(String(value)));
  }

  return (
    <TextField
      label={label ?? t("income")}
      hint={hint}
      error={error}
      prefix="₹"
      inputMode="numeric"
      autoComplete="off"
      placeholder={t("incomePlaceholder")}
      value={text}
      onChange={(e) => {
        const shown = groupIndian(e.target.value);
        setText(shown);
        const digits = shown.replace(/\D/g, "");
        if (!digits) {
          setError(undefined);
          setSeen(undefined);
          return onChange(undefined);
        }
        const n = Number(digits);
        if (n > INCOME_MAX) return setError(t("incomeTooHigh"));
        setError(undefined);
        setSeen(n);
        onChange(n);
      }}
    />
  );
}

// A percentage from 0 to 100 with at most one decimal place.
export function PercentField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const t = useTranslations("fields");
  return (
    <DecimalField label={label} hint={hint} value={value} onChange={onChange} suffix="%" max={100} example="78.5" placeholder={t("percentPlaceholder")} decimals={1} />
  );
}

export function DecimalField({
  label,
  hint,
  value,
  onChange,
  suffix,
  max,
  placeholder,
  example,
  decimals = 2,
}: {
  label: string;
  hint?: ReactNode;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  max?: number;
  placeholder?: string;
  // Shown in "Use a number like 78.5" when the format is wrong.
  example?: string;
  decimals?: number;
}) {
  const t = useTranslations("fields");
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const [error, setError] = useState<string>();
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setText(value === undefined ? "" : String(value));
  }
  const pattern = new RegExp(`^\\d+(\\.\\d{0,${decimals}})?$`);

  return (
    <TextField
      label={label}
      hint={hint}
      error={error}
      suffix={suffix}
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const typed = e.target.value.replace(",", ".").trim();
        setText(typed);
        if (!typed) {
          setError(undefined);
          setSeen(undefined);
          return onChange(undefined);
        }
        if (!pattern.test(typed)) return setError(t("numberLike", { example: example ?? "78.5" }));
        const n = Number(typed);
        if (max !== undefined && n > max) return setError(t("numberRange", { max }));
        setError(undefined);
        setSeen(n);
        onChange(n);
      }}
    />
  );
}
