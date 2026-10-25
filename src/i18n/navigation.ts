import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Link and router that keep the student in their language: href="/results" goes to /hi/results in Hindi.
export const { Link, usePathname, useRouter } = createNavigation(routing);
