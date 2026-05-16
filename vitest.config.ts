import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

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
          name: "jsdom",
          environment: "jsdom",
          include: ["__tests__/react/**/*.tsx"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
    ],
  },
});
