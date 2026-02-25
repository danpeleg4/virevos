import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const moduleNameMapper = {
  "^@/(.*)$": "<rootDir>/$1",
  "^@db/(.*)$": "<rootDir>/../db/$1",
};

const transform = {
  "^.+\\.(ts|tsx)$": ["babel-jest", { presets: ["next/babel"] }],
};

const config = {
  coverageProvider: "v8",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  projects: [
    {
      displayName: "node",
      testEnvironment: "node",
      testMatch: ["**/__tests__/api/**/*.ts", "**/__tests__/lib/**/*.ts"],
      moduleNameMapper,
      transform,
    },
    {
      displayName: "jsdom",
      testEnvironment: "jsdom",
      testMatch: ["**/__tests__/react/**/*.tsx"],
      moduleNameMapper,
      transform,
    },
  ],
};

export default createJestConfig(config);
