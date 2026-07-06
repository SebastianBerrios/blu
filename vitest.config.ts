import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    allowOnly: false,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/utils/**/*.ts",
        "src/features/**/utils/*.ts",
        "src/features/**/services/*.ts",
      ],
      exclude: ["**/*.test.ts", "**/index.ts", "**/__tests__/**"],
    },
  },
});
