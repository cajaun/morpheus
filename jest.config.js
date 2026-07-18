/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  clearMocks: true,
  collectCoverageFrom: [
    "features/action-tray/system/**/*.{ts,tsx}",
    "!features/action-tray/system/**/__tests__/**",
    "!features/action-tray/system/**/types/**",
    "!features/action-tray/system/**/index.ts",
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
