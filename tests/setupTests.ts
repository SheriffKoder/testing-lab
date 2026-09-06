/**
 * @file tests/setupTests.ts
 * Jest setup run before every test file: registers @testing-library/jest-dom
 * matchers (toBeInTheDocument, toHaveTextContent, etc.).
 *
 * Used by: jest.config.ts `setupFilesAfterEnv`.
 * Used for: global, cross-suite test environment prep only — keep minimal;
 * add next/navigation mocks or polyfills here only when a real test needs them.
 *
 * Steps:
 * 1. Import jest-dom so its expect.extend matchers are available in every suite.
 */

import "@testing-library/jest-dom";
