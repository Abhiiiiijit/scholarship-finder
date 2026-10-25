// Only these GitHub logins can use the admin editor. Override with ADMIN_GITHUB_LOGINS
// (comma-separated) when someone else helps enter schemes.
const DEFAULT_ADMINS = "Abhiiiiijit";

export function adminLogins(env: string | undefined = process.env.ADMIN_GITHUB_LOGINS): string[] {
  return (env ?? DEFAULT_ADMINS)
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}

// GitHub logins are case-insensitive.
export function isAdmin(login: unknown, admins = adminLogins()): boolean {
  return typeof login === "string" && admins.includes(login.toLowerCase());
}
