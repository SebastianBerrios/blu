import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/utils/**/*.ts",
        "src/features/**/utils/*.ts",
        "src/features/**/services/paymentHelpers.ts",
      ],
      exclude: ["**/*.test.ts", "**/index.ts"],
    },
  },
});
