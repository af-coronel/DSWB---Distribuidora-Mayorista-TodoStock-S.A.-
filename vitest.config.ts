import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html", "json"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/server.ts",
        "src/core/database/connection.ts",
        "src/core/realtime/socketServer.ts",
        "src/modules/**/infrastructure/persistence/**",
        "src/modules/**/infrastructure/http/routes/**",
        "src/views/**",
        "src/modules/**/index.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    conditions: ["node"],
  },
});
