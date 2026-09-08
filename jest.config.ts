/**
 * @file jest.config.ts
 * Jest configuration for the Next.js app: jsdom environment, RTL setup, and
 * coverage scoped to FSD source layers (entities, features, views, widgets, shared).
 *
 * Used by: `npm test` / `npm run test:watch` / `npm run test:coverage` (Jest CLI).
 * Used for: compiling TS/JSX via next/jest, loading matchers from tests/setupTests.ts,
 * and collecting coverage from domain/UI code (not app/ route shells or tests/).
 *
 * Steps:
 * 1. Wrap next/jest so SWC, path aliases (@/*), CSS/asset stubs, and .env load.
 * 2. Force jsdom so React/RTL have document/window.
 * 3. Run tests/setupTests.ts after the env is ready (jest-dom matchers).
 * 4. Collect coverage from FSD source layers; skip barrels and declaration files.
 * 5. Map `@/` in moduleNameMapper so `jest.mock("@/...")` resolves (SWC alone
 *    rewrites imports, not Jest's mock registry).
 */

import type { Config } from "jest";
import nextJest from "next/jest.js";

/////////////////////////////////////////////////////////////
// next/jest reads next.config, tsconfig paths, and .env*; returns a config factory.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  // Components and RTL need a fake DOM; Jest's default "node" has no document.
  testEnvironment: "jsdom",

  // Lives under tests/ (FSD testing unit), not repo root — setup is test infrastructure.
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],

  // Measure FSD source layers only; app/ is thin route shells, tests/ are the suite.
  collectCoverageFrom: [
    "entities/**/*.{ts,tsx}",
    "features/**/*.{ts,tsx}",
    "views/**/*.{ts,tsx}",
    "widgets/**/*.{ts,tsx}",
    "shared/**/*.{ts,tsx}",
    "!**/index.ts",
    "!**/*.d.ts",
  ],

  // next/jest's SWC transform rewrites `@/` in import statements, but
  // `jest.mock("@/...")` is resolved by Jest's module system. Map the alias
  // so Item 6 query mocks (and any future path-aliased mocks) resolve on disk.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

export default createJestConfig(config);
