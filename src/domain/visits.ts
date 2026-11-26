import { z } from "zod";

// Sites whose public "N visitors" counter Paatra keeps. The portfolio has no backend of its own,
// so it reads and bumps its counter through Paatra's /api/visits/portfolio.
export const VISIT_SITES = ["paatra", "portfolio"] as const;
export const visitSiteSchema = z.enum(VISIT_SITES);
export type VisitSite = z.infer<typeof visitSiteSchema>;
