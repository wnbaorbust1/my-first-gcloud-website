import "dotenv/config";
import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * INTEGRATION TEST SUITE — the "route/integration coverage" half of the
 * audit's automated-test-suite follow-up (the other half, `vitest.config.mts`,
 * is pure/DB-free and runs as part of `npm test`). These tests use the
 * REAL Prisma client against a REAL Postgres database (same `DATABASE_URL`
 * as `npm run dev`), unlike the unit suite's `@/lib/prisma` mock — they
 * genuinely exercise authorization checks, rate limiting, and the
 * capacity-race transaction against the database, the same things every
 * phase through 12 verified live-only. Requires Postgres running
 * (`service postgresql start` locally); NOT part of `npm test` because it
 * needs a live database and mutates real rows — run explicitly via
 * `npm run test:integration`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(import.meta.dirname, "./src/test/empty-module.ts"),
      // Deliberately NOT aliased here — integration tests use the real
      // Prisma client (src/lib/prisma.ts) against DATABASE_URL.
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    // Real DB transactions/round-trips are slower than pure-function
    // assertions; the capacity-race test in particular does two
    // concurrent registrations against a Serializable transaction.
    testTimeout: 15000,
    // These tests share rows across a session/business fixture within a
    // file — run test files serially so cleanup in one doesn't race
    // fixture setup in another against the same real database.
    fileParallelism: false,
  },
});
