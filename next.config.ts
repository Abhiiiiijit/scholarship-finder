import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Student copy comes from src/i18n/messages (next-intl, no locale in the URL).
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Which deploy this is, for src/i18n/locales.ts: unreviewed languages stay off production. Set at
  // build time so the server and the browser agree.
  env: { PAATRA_DEPLOY: process.env.VERCEL_ENV ?? "development" },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
