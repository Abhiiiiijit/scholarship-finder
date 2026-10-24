import type { ReactNode } from "react";

type Tone = "warning" | "info" | "success";

const TONES: Record<Tone, string> = {
  warning: "bg-warn-tint text-warn",
  info: "bg-info-tint text-info",
  success: "bg-pass-tint text-pass",
};

export function Alert({ tone, title, children }: { tone: Tone; title: string; children?: ReactNode }) {
  return (
    <div role={tone === "warning" ? "alert" : "status"} className={`rounded-xl px-3.5 py-3 text-sm leading-5 ${TONES[tone]}`}>
      <b className="font-semibold">{title}</b>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
