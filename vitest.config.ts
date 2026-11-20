import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      { test: { name: "unit", include: ["src/**/*.test.ts"] } },
      { test: { name: "db", include: ["supabase/tests/**/*.test.ts"], fileParallelism: false, testTimeout: 20000, hookTimeout: 60000 } },
    ],
  },
});
