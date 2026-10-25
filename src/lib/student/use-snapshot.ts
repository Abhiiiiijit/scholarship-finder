"use client";

import { useCallback, useEffect, useState } from "react";
import { snapshotSchema, type Snapshot } from "../rules/snapshot";

// Downloads the published rules once per visit. Results are never shown from an old copy: if the
// download fails, the screen says so and offers a retry (S09).

export type SnapshotState =
  | { status: "loading" }
  | { status: "ready"; snapshot: Snapshot }
  | { status: "failed"; reason: "offline" | "slow" | "empty" | "error" };

// Over 8 seconds without data goes to S09.
const TIMEOUT_MS = 8000;
// Reused while moving between results and scheme pages; the server caches for minutes anyway.
const REUSE_MS = 5 * 60 * 1000;

let memo: { snapshot: Snapshot; at: number } | null = null;

async function download(): Promise<SnapshotState> {
  if (memo && Date.now() - memo.at < REUSE_MS) return { status: "ready", snapshot: memo.snapshot };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("/api/rules/latest", { signal: ctrl.signal });
    if (res.status === 404) return { status: "failed", reason: "empty" };
    if (!res.ok) return { status: "failed", reason: "error" };
    const parsed = snapshotSchema.safeParse(await res.json());
    if (!parsed.success) return { status: "failed", reason: "error" };
    memo = { snapshot: parsed.data, at: Date.now() };
    return { status: "ready", snapshot: parsed.data };
  } catch {
    if (ctrl.signal.aborted) return { status: "failed", reason: "slow" };
    return { status: "failed", reason: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error" };
  } finally {
    clearTimeout(timer);
  }
}

export function useSnapshot(): [SnapshotState, () => void] {
  const [state, setState] = useState<SnapshotState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    download().then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);
  return [state, retry];
}
