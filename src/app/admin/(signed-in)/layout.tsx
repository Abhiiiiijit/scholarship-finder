import Link from "next/link";
import { signOut } from "@/auth";
import { requireAdmin } from "@/lib/auth/require-admin";

// Admin pages read the session on every request; nothing here is worth prerendering.
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { login } = await requireAdmin();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-4 py-3 text-sm">
          <Link href="/admin" className="font-semibold text-navy">
            Registry
          </Link>
          <span className="flex-1" />
          <span className="text-zinc-500">{login}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="text-zinc-700 underline">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
