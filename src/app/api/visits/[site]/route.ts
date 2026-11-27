import { connection } from "next/server";
import { visitSiteSchema } from "@/domain/visits";
import { db } from "@/server/db/client";
import { addVisit, visitCount } from "@/server/repositories/visit-repo";

// Public "N visitors" counters for Paatra and the portfolio. GET reads, POST adds one visit. The
// body is ignored: nothing about the visitor is received or stored (CLAUDE.md rule 2). The phone
// itself decides it is a first visit (a localStorage flag), so a refresh does not count again.

// The portfolio is a static site on another origin and calls this from the browser.
const ALLOWED_ORIGINS = new Set(["https://abhijitbosedas.vercel.app", "https://abhijitbosedas.com", "https://www.abhijitbosedas.com"]);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return { "access-control-allow-origin": origin, "access-control-allow-methods": "GET, POST", vary: "origin" };
}

async function siteOf(params: Promise<{ site: string }>) {
  const parsed = visitSiteSchema.safeParse((await params).site);
  return parsed.success ? parsed.data : null;
}

export async function GET(req: Request, { params }: RouteContext<"/api/visits/[site]">) {
  await connection();
  const site = await siteOf(params);
  if (!site) return Response.json({ error: "Unknown site" }, { status: 404 });
  const count = await visitCount(db, site);
  return Response.json({ count }, { headers: { ...cors(req), "cache-control": "public, max-age=0, s-maxage=60" } });
}

export async function POST(req: Request, { params }: RouteContext<"/api/visits/[site]">) {
  await connection();
  const site = await siteOf(params);
  if (!site) return Response.json({ error: "Unknown site" }, { status: 404 });
  const count = await addVisit(db, site, new Date());
  return Response.json({ count }, { headers: { ...cors(req), "cache-control": "no-store" } });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req) });
}
