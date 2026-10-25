"use client";

import { useCallback, useEffect, useState } from "react";
import { downloadSnapshot, type SnapshotState } from "@/features/eligibility/api/snapshot-client";

export type { SnapshotState };

export function useSnapshot(): [SnapshotState, () => void] {
  const [state, setState] = useState<SnapshotState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    downloadSnapshot().then((s) => live && setState(s));
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
