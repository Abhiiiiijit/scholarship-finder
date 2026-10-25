import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Folder boundaries (see CLAUDE.md "How it fits together"). Each block owns
// one folder, because a later block replaces the rule rather than adding to it.
const RULE = "@typescript-eslint/no-restricted-imports";
const FEATURES = ["eligibility", "registry"];
const TESTS = ["**/*.test.ts", "**/*.test.tsx"];

const ban = (group, message, allowTypeImports = false) => ({ group, message, allowTypeImports });
const otherFeatures = (feature) =>
  FEATURES.filter((f) => f !== feature).map((f) =>
    ban([`@/features/${f}`, `@/features/${f}/**`], "A feature never imports another feature. Move shared code to src/domain or src/components."),
  );

const boundaries = [
  {
    // Pure TypeScript shared by the phone and the server: Zod only.
    files: ["src/domain/**"],
    ignores: TESTS,
    rules: {
      [RULE]: ["error", {
        paths: ["react", "react-dom", "next", "drizzle-orm", "postgres", "server-only"].map((name) => ({
          name, message: "src/domain is pure TypeScript: no React, Next or database code.",
        })),
        patterns: [
          ban(["next/*", "drizzle-orm/*", "@/server/**", "@/features/**", "@/components/**", "@/app/**", "@/lib/**"],
            "src/domain imports only Zod and other src/domain files."),
        ],
      }],
    },
  },
  {
    // Shared UI knows nothing about a feature or the server.
    files: ["src/components/**"],
    rules: {
      [RULE]: ["error", {
        patterns: [ban(["@/features/**", "@/server/**", "@/app/**"], "Shared UI may import src/domain only. Put feature code in its feature.")],
      }],
    },
  },
  {
    // Server code never renders UI or reaches into a feature.
    files: ["src/server/**"],
    rules: {
      [RULE]: ["error", {
        paths: [{ name: "react", message: "src/server has no UI." }],
        patterns: [ban(["@/features/**", "@/components/**", "@/app/**"], "src/server may import src/domain only.")],
      }],
    },
  },
  {
    // Routes use a feature through its index.ts, never its internals.
    files: ["src/app/**"],
    rules: {
      [RULE]: ["error", {
        patterns: [ban(["@/features/*/**"], "Import a feature from its index (@/features/<name>).")],
      }],
    },
  },
  ...FEATURES.flatMap((feature) => [
    {
      // Views, hooks and lib reach the server only through the feature's actions.
      files: [`src/features/${feature}/**`],
      ignores: [`src/features/${feature}/actions/**`, ...TESTS],
      rules: {
        [RULE]: ["error", {
          patterns: [
            ...otherFeatures(feature),
            ban(["@/server/**"], "Call the server through a server action in actions/ (type imports are fine).", true),
            ban(["@/app/**"], "A feature never imports a route."),
          ],
        }],
      },
    },
    {
      // Server actions and tests may use the server, but still not another feature.
      files: [`src/features/${feature}/actions/**`, ...TESTS.map((t) => `src/features/${feature}/${t}`)],
      rules: { [RULE]: ["error", { patterns: otherFeatures(feature) }] },
    },
  ]),
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
