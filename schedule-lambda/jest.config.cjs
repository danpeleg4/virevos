/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          esModuleInterop: true,
          target: "ES2016",
          strict: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@repo/db/(.*)$": "<rootDir>/../db/$1",
  },
};
