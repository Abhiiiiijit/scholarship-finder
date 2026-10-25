"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Profile } from "@/domain/profile";
import { loadAnswers, saveAnswers, subscribeAnswers } from "@/features/eligibility/store/answers";

// null until the browser has read localStorage, so the server render and hydration agree.
export function useAnswers(): [Profile | null, (update: (p: Profile) => Profile) => void] {
  const profile = useSyncExternalStore(subscribeAnswers, loadAnswers, () => null);
  const update = useCallback((fn: (p: Profile) => Profile) => saveAnswers(fn(loadAnswers())), []);
  return [profile, update];
}
