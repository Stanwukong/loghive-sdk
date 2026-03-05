// vitest.config.ts

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Test environment
    environment: "jsdom", // Browser-like environment for most tests

    // Global test setup
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts", // Just exports
        "src/types.ts", // Type definitions
        "src/config.ts", // Configuration constants
        "**/*.d.ts",
        "**/*.config.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/example/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Test file patterns
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],

    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,

    // Reporters
    reporters: ["verbose"],

    // Mock reset behavior
    mockReset: true,
    restoreMocks: true,

    // Retry failed tests once (for flaky network tests)
    retry: 1,

    // Run tests in parallel
    threads: true,

    // Benchmark support
    benchmark: {
      include: ["tests/**/*.bench.ts"],
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
