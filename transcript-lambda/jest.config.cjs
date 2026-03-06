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
    "^.+\\.js$": [
      "babel-jest",
      { presets: [["@babel/preset-env", { targets: { node: "current" } }]] },
    ],
  },
  transformIgnorePatterns: ["/node_modules/(?!(uuid)/)"],
  moduleNameMapper: {
    "^@repo/db/(.*)$": "<rootDir>/../db/$1",
  },
};
