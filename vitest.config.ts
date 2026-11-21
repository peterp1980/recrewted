import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  // Components are tested with JSX (tsconfig keeps JSX for Next.js).
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    projects: [
      { extends: true, resolve: { alias }, test: { name: "unit", include: ["src/**/*.test.ts"] } },
      { test: { name: "db", include: ["supabase/tests/**/*.test.ts"], fileParallelism: false, testTimeout: 20000, hookTimeout: 60000 } },
    ],
  },
});
