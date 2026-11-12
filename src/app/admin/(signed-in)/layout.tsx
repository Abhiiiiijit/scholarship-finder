import Link from "next/link";
import { signOut } from "@/server/auth/auth";
import { requireAdmin } from "@/server/auth/require-admin";
import { ThemeToggle } from "@/components/ui/Theme";

// Admin pages read the session on every request; nothing here is worth prerendering.
export const instant = false;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { login } = await requireAdmin();
  return (
    <div className="flex flex-1 flex-col bg-ground text-ink">
      <header className="bg-bar text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <b>Paatra</b>
            <span className="rounded-md bg-bar-soft px-2 py-0.5 text-[13px]">Admin</span>
          </div>
          <nav className="flex gap-5 text-sm">
            <Link href="/admin" className="font-semibold text-white">
              Registry
            </Link>
          </nav>
          <span className="flex-1" />
          <span className="text-sm text-bar-muted max-sm:hidden">{login}</span>
          <ThemeToggle toDark="Switch to dark theme" toLight="Switch to light theme" tone="bar" />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button type="submit" className="min-h-8 text-sm text-bar-muted underline hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-7 sm:px-8">{children}</main>
    </div>
  );
}
