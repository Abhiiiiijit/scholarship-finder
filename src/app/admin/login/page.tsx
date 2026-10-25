import { signIn } from "@/server/auth/auth";

export const metadata = { title: "Admin sign-in · Scholarship Finder" };

// Admin pages read the session on every request; nothing here is worth prerendering.
export const instant = false;

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold text-navy">Scholarship registry</h1>
      <p className="text-zinc-700">Sign in with GitHub to add and publish schemes.</p>
      {error && (
        <p role="alert" className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
          {error === "AccessDenied"
            ? "That GitHub account isn't on the admin list."
            : "Sign-in didn't finish. Try again."}
        </p>
      )}
      <form
        action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/admin" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md bg-navy px-4 py-3 font-medium text-white hover:opacity-90"
        >
          Sign in with GitHub
        </button>
      </form>
    </main>
  );
}
