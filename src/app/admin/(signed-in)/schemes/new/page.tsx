import { requireAdmin } from "@/server/auth/require-admin";
import { SchemeEditor } from "../SchemeEditor";

export const metadata = { title: "Add scheme · Admin" };

export default async function NewScheme() {
  await requireAdmin();
  return <SchemeEditor />;
}
