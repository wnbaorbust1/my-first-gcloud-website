import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * AUTOMATED TEST SUITE (launch-hardening audit finding: every phase
 * through 12 was verified live against a real Postgres database, never
 * a checked-in regression suite). Scoped to pure, DB-free business logic
 * only — the highest-risk functions that were hand-traced during the
 * audit (assessment scoring/recommendation, billing status resolution,
 * pricing constants) now have a permanent regression test instead of a
 * one-time manual check. Anything that touches Prisma/Postgres is still
 * verified live, the same way every prior phase was — this suite isn't
 * trying to be an integration-test harness.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // "server-only" always throws when resolved via plain Node module
      // rules (its whole trick is Next.js's webpack "react-server"
      // condition swapping it for an empty module) — swap it here too so
      // pure functions in files that happen to start with `import
      // "server-only"` are importable under Vitest without pulling in
      // any App Router runtime.
      "server-only": path.resolve(import.meta.dirname, "./src/test/empty-module.ts"),
      "@/lib/prisma": path.resolve(import.meta.dirname, "./src/test/prisma-mock.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
