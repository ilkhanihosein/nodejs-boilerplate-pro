import { defineConfig } from "vitest/config";

/** Fixed values so `config/env` loads in tests without a local `.env` (never use in production). */
const testJwtAccessSecret = "vitest-only-jwt-access-secret-32chars-min";
const testJwtRefreshSecret = "vitest-only-jwt-refresh-secret-32chars-mn";
const testMongoUri = "mongodb://127.0.0.1:27017/vitest-placeholder-uri";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/vitest-setup.ts"],
    include: ["tests/**/*.test.ts"],
    passWithNoTests: false,
    env: {
      JWT_ACCESS_SECRET: testJwtAccessSecret,
      JWT_REFRESH_SECRET: testJwtRefreshSecret,
      MONGODB_URI: testMongoUri,
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/types/**"],
      thresholds: {
        lines: 55,
        statements: 55,
        branches: 44,
        functions: 58,
      },
    },
  },
});
