import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";

const styles: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-ink disabled:bg-disabled disabled:text-muted",
  secondary: "border border-navy bg-white text-navy hover:bg-ground disabled:border-disabled disabled:text-muted",
};
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={`${base} ${styles[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  external = false,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; external?: boolean }) {
  const ext = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return <Link className={`${base} ${styles[variant]} no-underline ${className}`} {...ext} {...props} />;
}
