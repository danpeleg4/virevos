import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      next: {
        rootDir: "web/",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": ["error", "web/app"],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "web/.next/**",
    "web/out/**",
    "web/build/**",
    "web/next-env.d.ts",
    "**/node_modules/**",
  ]),
]);

export default eslintConfig;
