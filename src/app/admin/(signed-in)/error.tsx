"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

// A failed admin page (Neon down, a bad query) keeps the admin header and offers a retry.
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Alert tone="warning" title="This page couldn't load.">
        Nothing was changed. If it keeps happening, check the database in Neon and the runtime logs in Vercel
        {digest ? ` (error id ${digest})` : ""}.
      </Alert>
      <div>
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </div>
  );
}
