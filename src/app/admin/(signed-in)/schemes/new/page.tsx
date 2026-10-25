import { requireAdmin } from "@/server/auth/require-admin";
import { SchemeEditorView } from "@/features/registry";

export const metadata = { title: "Add scheme · Admin" };

export default async function NewScheme() {
  await requireAdmin();
  return <SchemeEditorView />;
}
