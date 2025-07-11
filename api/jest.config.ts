import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  roots: ["<rootDir>/src"],
  testMatch: ["**/tests/**/*.test.ts"],
};

export default config;
