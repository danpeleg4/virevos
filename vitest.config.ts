import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    clearMocks: true,
    css: false,
    coverage: {
      provider: "v8",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["__tests__/api/**/*.ts", "__tests__/lib/**/*.ts"],
          setupFiles: ["./vitest.setup.node.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "browser",
          browser: {
            provider: playwright(),
            enabled: true,
            headless: true,
            instances: [
              {
                browser: "chromium",
              },
            ],
          },
          include: ["__tests__/react/**/*.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
