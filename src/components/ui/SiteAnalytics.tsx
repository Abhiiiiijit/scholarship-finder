"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Counts page visits for the owner in the Vercel dashboard: cookieless, so no banner.
// Only the path is sent. Query strings and hashes are dropped so nothing a student
// typed could ever leave the phone (CLAUDE.md rule 2: answers stay in localStorage).
export function pathOnly(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  return { ...event, url: `${url.origin}${url.pathname}` };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={pathOnly} />;
}
