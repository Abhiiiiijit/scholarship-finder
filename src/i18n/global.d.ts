import type { AppLocale } from "./locales";
import type en from "./messages/en.json";

// Message keys are checked by TypeScript: a key missing from en.json fails typecheck.
declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof en;
  }
}
