import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";
import { isAdmin } from "@/server/auth/allowlist";

// First gate for /admin: a plain redirect before anything renders. Layouts render in parallel
// with their pages, so every admin page and server action still calls requireAdmin() itself.
export default auth((req) => {
  if (!isAdmin(req.auth?.user?.login)) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
  }
});

export const config = { matcher: ["/admin", "/admin/((?!login$).*)"] };
