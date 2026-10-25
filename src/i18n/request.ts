import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, TIME_ZONE } from "./locales";
import en from "./messages/en.json";

// English only for now. Reading the request locale here (a header or cookie) would make every
// student page dynamic, so the locale stays fixed until a language picker lands.
export default getRequestConfig(() => ({ locale: DEFAULT_LOCALE, messages: en, timeZone: TIME_ZONE }));
