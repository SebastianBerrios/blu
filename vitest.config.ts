import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    allowOnly: false,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/utils/**/*.ts",
        "src/features/**/utils/*.ts",
        "src/features/**/services/*.ts",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/index.ts", "**/__tests__/**"],
    },
  },
});
