import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": local("./src"),
      // Tests run server code directly; outside React Server Components "server-only" would throw.
      "server-only": local("./node_modules/server-only/empty.js"),
    },
  },
  test: { include: ["src/**/*.test.ts"] },
});
