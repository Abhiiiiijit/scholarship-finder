import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { isAdmin } from "./allowlist";

// Admin sign-in only. Sessions are JWT cookies, so nothing about the admin is stored in Postgres.
// Reads AUTH_SECRET, AUTH_GITHUB_ID and AUTH_GITHUB_SECRET from the environment.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  pages: { signIn: "/admin/login", error: "/admin/login" },
  callbacks: {
    signIn: ({ profile }) => isAdmin(profile?.login),
    jwt: ({ token, profile }) => {
      if (profile?.login) token.login = profile.login;
      return token;
    },
    session: ({ session, token }) => {
      session.user.login = typeof token.login === "string" ? token.login : undefined;
      return session;
    },
  },
});

declare module "next-auth" {
  interface User {
    login?: string;
  }
}
