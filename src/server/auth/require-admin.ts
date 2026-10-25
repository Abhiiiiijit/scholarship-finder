import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "./auth";
import { isAdmin } from "./allowlist";

// Call at the top of every admin page and server action. The allowlist is checked again here,
// not only at sign-in, so removing a login takes effect on the next request.
export async function requireAdmin() {
  // Admin pages are never prerendered: everything after this runs per request.
  await connection();
  const session = await auth();
  if (!isAdmin(session?.user?.login)) redirect("/admin/login");
  return { login: session!.user!.login! };
}
