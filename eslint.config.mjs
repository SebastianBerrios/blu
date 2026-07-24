import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Enforce the "0 alert() calls" milestone — use inline error UI / toasts instead.
      // Scoped to the globals the project eliminated; window.confirm() remains allowed
      // (see ProduccionTab), so no-alert (which also bans confirm) is intentionally not used.
      "no-restricted-globals": [
        "error",
        {
          name: "alert",
          message: "Use inline error UI or a toast instead of alert().",
        },
        {
          name: "prompt",
          message: "Use a form input or modal instead of prompt().",
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
