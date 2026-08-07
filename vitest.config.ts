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
          // All files share one headless Chromium instance/MSW worker, so
          // running many files concurrently starves the event loop and can
          // silently drop user-event interactions under load.
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["__tests__/integration/**/*.test.ts"],
          globalSetup: ["./__tests__/integration/global-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
          // All files share one Postgres container and resetDb() truncates
          // the whole database, so files must not run concurrently.
          fileParallelism: false,
        },
      },
    ],
  },
});
