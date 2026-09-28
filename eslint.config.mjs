import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Unit portraits are inline SVG data URLs — next/image adds nothing here.
  { files: ["src/**/*.tsx"], rules: { "@next/next/no-img-element": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local tool state / build output (huge pnpm store would OOM eslint).
    ".sites-runtime/**",
    ".wrangler/**",
    "dist/**",
    ".vinext/**",
  ]),
]);

export default eslintConfig;
