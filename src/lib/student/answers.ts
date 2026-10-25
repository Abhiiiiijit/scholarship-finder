import { profileSchema, type Profile } from "@/domain/profile";
import { STATE_BY_CODE } from "@/domain/states";

// A student's answers live only in this browser's localStorage. Nothing here talks to a server.

const KEY = "paatra.answers.v1";
const EVENT = "paatra:answers";

// Keeps every answer that still fits the schema and drops the rest, so one bad value saved by an
// older build never throws away the whole profile.
export function sanitize(raw: unknown): Profile {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const one = profileSchema.safeParse({ [key]: value });
    if (one.success && key in one.data) out[key] = (one.data as Record<string, unknown>)[key];
  }
  return out as Profile;
}

// A new domicile state changes the category list and the state questions, so both are cleared.
export function withState(p: Profile, code: string | undefined): Profile {
  if (p.domicile_state === code) return p;
  const next: Profile = { ...p, domicile_state: code };
  delete next.category;
  delete next.state;
  return next;
}

export function isLive(code: string | undefined): boolean {
  return !!code && STATE_BY_CODE.has(code);
}

let cache: { raw: string | null; profile: Profile } | null = null;

function read(): Profile {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Private mode or blocked storage: answers last for this page only.
  }
  if (cache && cache.raw === raw) return cache.profile;
  let profile: Profile = {};
  try {
    profile = raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    profile = {};
  }
  cache = { raw, profile };
  return profile;
}

export function loadAnswers(): Profile {
  return read();
}

export function saveAnswers(p: Profile) {
  const raw = JSON.stringify(p);
  cache = { raw, profile: p };
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // Kept in memory for this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeAnswers(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function hasAnswers(p: Profile | null): boolean {
  return !!p && Object.keys(p).length > 0;
}
