"use client";

import { THEME_KEY } from "./ThemeScript";

function flip() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Private mode: the switch still works for this visit.
  }
}

// A round icon button: a moon in the light theme, a sun in the dark one. Icons and labels swap with
// CSS, so the server render matches whatever the head script picked.
export function ThemeToggle({ toDark, toLight, tone = "page" }: { toDark: string; toLight: string; tone?: "page" | "bar" }) {
  const look =
    tone === "bar"
      ? "border-bar-soft text-bar-muted hover:text-white focus-visible:outline-white"
      : "border-line bg-surface text-navy hover:bg-line-soft focus-visible:outline-navy";
  return (
    <button
      type="button"
      onClick={flip}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border focus-visible:outline-2 ${look}`}
    >
      <span className="sr-only dark:hidden">{toDark}</span>
      <span className="sr-only hidden dark:inline">{toLight}</span>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px] dark:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="hidden size-[18px] dark:block" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
