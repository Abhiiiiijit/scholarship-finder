"use client";

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
  label = "Annual family income",
  hint,
  value,
  onChange,
}: {
  label?: string;
  hint?: ReactNode;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
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
      label={label}
      hint={hint}
      error={error}
      prefix="₹"
      inputMode="numeric"
      autoComplete="off"
      placeholder="e.g. 3,00,000"
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
        if (n > INCOME_MAX) return setError("That is more than ₹99,99,99,999. Check the figure.");
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
  return (
    <DecimalField label={label} hint={hint} value={value} onChange={onChange} suffix="%" max={100} placeholder="e.g. 78.5" decimals={1} />
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
  decimals = 2,
}: {
  label: string;
  hint?: ReactNode;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  suffix?: string;
  max?: number;
  placeholder?: string;
  decimals?: number;
}) {
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
        const t = e.target.value.replace(",", ".").trim();
        setText(t);
        if (!t) {
          setError(undefined);
          setSeen(undefined);
          return onChange(undefined);
        }
        if (!pattern.test(t)) return setError(`Use a number like ${placeholder?.replace("e.g. ", "") ?? "78.5"}`);
        const n = Number(t);
        if (max !== undefined && n > max) return setError(`Enter a number from 0 to ${max}`);
        setError(undefined);
        setSeen(n);
        onChange(n);
      }}
    />
  );
}
