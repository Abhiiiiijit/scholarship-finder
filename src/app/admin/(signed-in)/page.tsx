import { requireAdmin } from "@/lib/auth/require-admin";

export default async function Registry() {
  await requireAdmin();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-navy">Registry</h1>
      <p className="text-zinc-700">Signed in. The scheme list and editor come next.</p>
    </section>
  );
}
