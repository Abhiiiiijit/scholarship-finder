"use client";

import { useCallback, useSyncExternalStore } from "react";

// Ticked documents on the scheme page, per scheme, kept in this browser only.

const KEY = "paatra.documents.v1";
const EVENT = "paatra:documents";
type Ticks = Record<string, string[]>;

let cache: { raw: string | null; ticks: Ticks } | null = null;

function read(): Ticks {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {}
  if (cache && cache.raw === raw) return cache.ticks;
  let ticks: Ticks = {};
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") {
      for (const [slug, docs] of Object.entries(parsed)) {
        if (Array.isArray(docs)) ticks[slug] = docs.filter((d): d is string => typeof d === "string");
      }
    }
  } catch {
    ticks = {};
  }
  cache = { raw, ticks };
  return ticks;
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const none: string[] = [];

export function useDocumentTicks(slug: string): [string[], (doc: string, have: boolean) => void] {
  const ticks = useSyncExternalStore(subscribe, read, () => null);
  const toggle = useCallback(
    (doc: string, have: boolean) => {
      const all = read();
      const mine = new Set(all[slug] ?? []);
      if (have) mine.add(doc);
      else mine.delete(doc);
      const raw = JSON.stringify({ ...all, [slug]: [...mine] });
      cache = null;
      try {
        window.localStorage.setItem(KEY, raw);
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [slug],
  );
  return [ticks?.[slug] ?? none, toggle];
}
