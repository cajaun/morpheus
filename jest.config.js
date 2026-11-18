// Recent Reanimated/Worklets ship a Jest resolver that loads their JavaScript
// implementation instead of the native module. Use it when it is installed.
const reanimatedJestResolver = (() => {
  try {
    return require.resolve("react-native-reanimated/jest/resolver");
  } catch {
    return undefined;
  }
})();

// Gesture Handler's own Jest mocks for its native module. Gesture Handler 3
// installs UI-runtime bindings on import, which needs these mocks under Jest.
const gestureHandlerJestSetup = (() => {
  try {
    return require.resolve("react-native-gesture-handler/jestSetup");
  } catch {
    return undefined;
  }
})();

/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  ...(reanimatedJestResolver ? { resolver: reanimatedJestResolver } : null),
  setupFiles: [
    ...(gestureHandlerJestSetup ? [gestureHandlerJestSetup] : []),
    "<rootDir>/jest.setup.js",
  ],
  clearMocks: true,
  modulePathIgnorePatterns: ["<rootDir>/lib/", "<rootDir>/example/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/types/**",
    "!src/**/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "json-summary"],
  coverageThreshold: {
    global: {
      branches: 42,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
