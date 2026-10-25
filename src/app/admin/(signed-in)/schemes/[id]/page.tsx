import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/require-admin";
import { todayInIndia } from "@/lib/format";
import { schemeBadge } from "@/domain/registry/status";
import { getScheme } from "@/server/repositories/scheme-repo";
import { SchemeEditorView, type EditorScheme } from "@/features/registry";

export const metadata = { title: "Edit scheme · Admin" };

export default async function EditScheme({ params }: PageProps<"/admin/schemes/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const found = await getScheme(db, id);
  if (!found) notFound();
  const { scheme, rules } = found;
  const now = new Date();

  const initial: EditorScheme = {
    id: scheme.id,
    badge: schemeBadge(scheme, todayInIndia(now), now),
    lastVerifiedAt: scheme.lastVerifiedAt?.toISOString() ?? null,
    draft: {
      trackerId: scheme.trackerId ?? "",
      slug: scheme.slug,
      name: scheme.name,
      provider: scheme.provider as EditorScheme["draft"]["provider"],
      stateCode: scheme.stateCode ?? "",
      source: scheme.source ?? "",
      appliesVia: scheme.appliesVia ?? "",
      sourceFormat: (scheme.sourceFormat as "HTML" | "PDF" | null) ?? "",
      officialUrl: scheme.officialUrl,
      amountText: scheme.amountText ?? "",
      reviewNotes: scheme.reviewNotes ?? "",
      benefitTypes: scheme.benefitTypes,
      documents: scheme.documents,
      cannotCombineWith: scheme.cannotCombineWith,
      opensOn: scheme.opensOn ?? "",
      deadline: scheme.deadline ?? "",
      rules: rules.map((r) => ({
        group: r.group,
        field: r.field,
        op: r.op,
        value: r.value,
        quote: r.quote,
        sourceUrl: r.sourceUrl,
        ambiguous: r.ambiguous,
      })),
    },
  };
  return <SchemeEditorView initial={initial} />;
}
